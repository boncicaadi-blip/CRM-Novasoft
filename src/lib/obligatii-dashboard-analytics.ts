import type { Obligatie, ObligatiePlata } from "@/types/obligatii";
import {
  getObligatieStatus,
  getZileDepasireObligatie,
  matchesAgingBucketObligatie,
  type AgingBucketObligatie,
  type ObligatieStatus,
} from "@/lib/obligatii-analytics";

export interface StatusDatum {
  status: ObligatieStatus;
  label: string;
  count: number;
  sold: number;
}

export function groupByStatusObligatii(obligatii: Obligatie[]): StatusDatum[] {
  const buckets: Record<ObligatieStatus, StatusDatum> = {
    restanta: { status: "restanta", label: "Restanta", count: 0, sold: 0 },
    la_zi: { status: "la_zi", label: "La zi", count: 0, sold: 0 },
    platita: { status: "platita", label: "Platita", count: 0, sold: 0 },
  };
  for (const o of obligatii) {
    const s = getObligatieStatus(o);
    buckets[s].count += 1;
    buckets[s].sold += o.sold;
  }
  return Object.values(buckets).filter((b) => b.count > 0);
}

export interface AgingDatum {
  bucket: AgingBucketObligatie;
  label: string;
  count: number;
  sold: number;
}

const AGING_LABELS: { key: AgingBucketObligatie; label: string }[] = [
  { key: "sold0_30", label: "0-30 zile" },
  { key: "sold31_60", label: "31-60 zile" },
  { key: "sold61_90", label: "61-90 zile" },
  { key: "sold91_180", label: "91-180 zile" },
  { key: "sold181_365", label: "181-365 zile" },
  { key: "sold365Plus", label: "peste 365 zile" },
];

export function groupByAgingObligatii(obligatii: Obligatie[]): AgingDatum[] {
  return AGING_LABELS.map(({ key, label }) => {
    const rows = obligatii.filter((o) => matchesAgingBucketObligatie(o, key));
    return {
      bucket: key,
      label,
      count: rows.length,
      sold: rows.reduce((s, o) => s + o.sold, 0),
    };
  });
}

export interface TipAchizitieDatum {
  tip: string;
  count: number;
  sold: number;
}

export function groupByTipAchizitieObligatii(obligatii: Obligatie[]): TipAchizitieDatum[] {
  const map = new Map<string, TipAchizitieDatum>();
  for (const o of obligatii) {
    const tip = o.tip_achizitie ?? "Necunoscut";
    const d = map.get(tip) ?? { tip, count: 0, sold: 0 };
    d.count += 1;
    d.sold += o.sold;
    map.set(tip, d);
  }
  return Array.from(map.values());
}

export interface FurnizorDatum {
  numeFurnizor: string;
  count: number;
  sold: number;
}

/** Top N furnizori dupa soldul restant (doar facturi chiar restante). */
export function topFurnizoriRestanti(obligatii: Obligatie[], n = 8): FurnizorDatum[] {
  const map = new Map<string, FurnizorDatum>();
  for (const o of obligatii) {
    if (getObligatieStatus(o) !== "restanta") continue;
    const d = map.get(o.nume_furnizor) ?? { numeFurnizor: o.nume_furnizor, count: 0, sold: 0 };
    d.count += 1;
    d.sold += o.sold;
    map.set(o.nume_furnizor, d);
  }
  return Array.from(map.values())
    .sort((a, b) => b.sold - a.sold)
    .slice(0, n);
}

export interface PlatiMonthDatum {
  month: string;
  monthKey: string;
  total: number;
  count: number;
  dateFrom: string;
  dateTo: string;
}

/** Evolutia platilor pe ultimele N luni, din jurnal (dupa data platii). */
export function buildPlatiTimeSeries(
  plati: ObligatiePlata[],
  monthsBack = 11
): PlatiMonthDatum[] {
  const now = new Date();
  const months: PlatiMonthDatum[] = [];
  for (let i = monthsBack; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const dateFrom = d.toISOString().slice(0, 10);
    const dateTo = new Date(nextMonth.getTime() - 86_400_000).toISOString().slice(0, 10);
    const label = d.toLocaleDateString("ro-RO", { month: "short", year: "2-digit" });
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ month: label, monthKey, total: 0, count: 0, dateFrom, dateTo });
  }

  for (const p of plati) {
    const dStr = p.data_plata;
    const match = months.find((m) => dStr >= m.dateFrom && dStr <= m.dateTo);
    if (match) {
      match.total += p.valoare;
      match.count += 1;
    }
  }

  return months;
}

/** Facturat lunar (dupa data facturii) - pentru graficul de "dinamica
 * obligatiilor": cat intra nou in fiecare luna. */
export function buildFacturatTimeSeries(
  obligatii: Obligatie[],
  monthsBack = 11
): { month: string; monthKey: string; facturat: number; count: number; dateFrom: string; dateTo: string }[] {
  const now = new Date();
  const months: {
    month: string;
    monthKey: string;
    facturat: number;
    count: number;
    dateFrom: string;
    dateTo: string;
  }[] = [];
  for (let i = monthsBack; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const dateFrom = d.toISOString().slice(0, 10);
    const dateTo = new Date(nextMonth.getTime() - 86_400_000).toISOString().slice(0, 10);
    const label = d.toLocaleDateString("ro-RO", { month: "short", year: "2-digit" });
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ month: label, monthKey, facturat: 0, count: 0, dateFrom, dateTo });
  }

  for (const o of obligatii) {
    const dStr = o.data_factura;
    if (!dStr) continue;
    const match = months.find((m) => dStr >= m.dateFrom && dStr <= m.dateTo);
    if (match) {
      match.facturat += o.total_factura;
      match.count += 1;
    }
  }

  return months;
}

export interface GrtMonthDatum {
  month: string;
  monthKey: string;
  target: number;
  realizat: number;
  grt: number | null;
}

/** GRT pe ultimele N luni - target calculat automat din facturile bifate
 * "Propus spre plata", realizat calculat mereu live din jurnalul de plati. */
export function buildGrtSeries(
  plati: ObligatiePlata[],
  targets: Record<string, number>,
  monthsBack = 11
): GrtMonthDatum[] {
  const timeSeries = buildPlatiTimeSeries(plati, monthsBack);
  return timeSeries.map((m) => {
    const target = targets[m.monthKey] ?? 0;
    return {
      month: m.month,
      monthKey: m.monthKey,
      target,
      realizat: m.total,
      grt: target > 0 ? (m.total / target) * 100 : null,
    };
  });
}

/** Facturile cu risc mare: sold mare SI vechi (produsul sold x zile depasire). */
export function topRiscObligatii(obligatii: Obligatie[], n = 5): Obligatie[] {
  return [...obligatii]
    .filter((o) => getObligatieStatus(o) === "restanta")
    .sort((a, b) => {
      const scoreA = a.sold * (getZileDepasireObligatie(a) ?? 0);
      const scoreB = b.sold * (getZileDepasireObligatie(b) ?? 0);
      return scoreB - scoreA;
    })
    .slice(0, n);
}

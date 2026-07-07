import type { Creanta, CreantaIncasare } from "@/types/creante";
import { toRomaniaISO } from "@/lib/date";
import {
  getCreantaStatus,
  getZileDepasire,
  matchesAgingBucket,
  dateMatchesPeriod,
  type AgingBucket,
  type CreantaStatus,
  type PeriodFilter,
} from "@/lib/creante-analytics";

export interface StatusDatum {
  status: CreantaStatus;
  label: string;
  count: number;
  sold: number;
}

export function groupByStatusCreante(creante: Creanta[]): StatusDatum[] {
  const buckets: Record<CreantaStatus, StatusDatum> = {
    restanta: { status: "restanta", label: "Restanta", count: 0, sold: 0 },
    la_zi: { status: "la_zi", label: "La zi", count: 0, sold: 0 },
    incasata: { status: "incasata", label: "Incasata", count: 0, sold: 0 },
  };
  for (const c of creante) {
    const s = getCreantaStatus(c);
    buckets[s].count += 1;
    buckets[s].sold += c.sold;
  }
  return Object.values(buckets).filter((b) => b.count > 0);
}

export interface AgingDatum {
  bucket: AgingBucket;
  label: string;
  count: number;
  sold: number;
}

const AGING_LABELS: { key: AgingBucket; label: string }[] = [
  { key: "sold0_30", label: "0-30 zile" },
  { key: "sold31_60", label: "31-60 zile" },
  { key: "sold61_90", label: "61-90 zile" },
  { key: "sold91_180", label: "91-180 zile" },
  { key: "sold181_365", label: "181-365 zile" },
  { key: "sold365Plus", label: "peste 365 zile" },
];

export function groupByAgingCreante(creante: Creanta[]): AgingDatum[] {
  return AGING_LABELS.map(({ key, label }) => {
    const rows = creante.filter((c) => matchesAgingBucket(c, key));
    return {
      bucket: key,
      label,
      count: rows.length,
      sold: rows.reduce((s, c) => s + c.sold, 0),
    };
  });
}

export interface TipVanzareDatum {
  tip: string;
  count: number;
  sold: number;
}

export function groupByTipVanzareCreante(creante: Creanta[]): TipVanzareDatum[] {
  const map = new Map<string, TipVanzareDatum>();
  for (const c of creante) {
    const tip = c.tip_vanzare ?? "Necunoscut";
    const d = map.get(tip) ?? { tip, count: 0, sold: 0 };
    d.count += 1;
    d.sold += c.sold;
    map.set(tip, d);
  }
  return Array.from(map.values());
}

export interface ClientDatum {
  numeFirma: string;
  count: number;
  sold: number;
}

/** Top N clienti dupa soldul restant (doar facturi chiar restante). */
export function topClientiRestanti(creante: Creanta[], n = 8): ClientDatum[] {
  const map = new Map<string, ClientDatum>();
  for (const c of creante) {
    if (getCreantaStatus(c) !== "restanta") continue;
    const d = map.get(c.nume_firma) ?? { numeFirma: c.nume_firma, count: 0, sold: 0 };
    d.count += 1;
    d.sold += c.sold;
    map.set(c.nume_firma, d);
  }
  return Array.from(map.values())
    .sort((a, b) => b.sold - a.sold)
    .slice(0, n);
}

export interface IncasariMonthDatum {
  month: string;
  monthKey: string;
  total: number;
  count: number;
  dateFrom: string;
  dateTo: string;
}

/** Evolutia incasarilor pe ultimele N luni, din jurnal (dupa data incasarii). */
export function buildIncasariTimeSeries(
  incasari: CreantaIncasare[],
  monthsBack = 11
): IncasariMonthDatum[] {
  const now = new Date();
  const months: IncasariMonthDatum[] = [];
  for (let i = monthsBack; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const dateFrom = toRomaniaISO(d);
    const dateTo = toRomaniaISO(new Date(nextMonth.getTime() - 86_400_000));
    const label = d.toLocaleDateString("ro-RO", { month: "short", year: "2-digit" });
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ month: label, monthKey, total: 0, count: 0, dateFrom, dateTo });
  }

  for (const i of incasari) {
    const dStr = i.data_incasare;
    const match = months.find((m) => dStr >= m.dateFrom && dStr <= m.dateTo);
    if (match) {
      match.total += i.valoare;
      match.count += 1;
    }
  }

  return months;
}

/** Facturat lunar (dupa data facturii) - pentru graficul de "dinamica
 * creantelor": cat intra nou in pipeline in fiecare luna. */
export function buildFacturatTimeSeries(
  creante: Creanta[],
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
    const dateFrom = toRomaniaISO(d);
    const dateTo = toRomaniaISO(new Date(nextMonth.getTime() - 86_400_000));
    const label = d.toLocaleDateString("ro-RO", { month: "short", year: "2-digit" });
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ month: label, monthKey, facturat: 0, count: 0, dateFrom, dateTo });
  }

  for (const c of creante) {
    const dStr = c.data_factura;
    if (!dStr) continue;
    const match = months.find((m) => dStr >= m.dateFrom && dStr <= m.dateTo);
    if (match) {
      match.facturat += c.total_factura;
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

/** GRT (Grad Realizare Target) pe ultimele N luni - combina targetul
 * (calculat automat din facturile bifate "Propus") cu valoarea real
 * incasata (din jurnal), recalculata mereu live, niciodata "inghetata" -
 * daca anulezi/adaugi o incasare pe o luna trecuta, GRT-ul acelei luni se
 * actualizeaza automat. */
export function buildGrtSeries(
  incasari: CreantaIncasare[],
  targets: Record<string, number>,
  monthsBack = 11
): GrtMonthDatum[] {
  const timeSeries = buildIncasariTimeSeries(incasari, monthsBack);
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
export function topRiscCreante(creante: Creanta[], n = 5): Creanta[] {
  return [...creante]
    .filter((c) => getCreantaStatus(c) === "restanta")
    .sort((a, b) => {
      const scoreA = a.sold * (getZileDepasire(a) ?? 0);
      const scoreB = b.sold * (getZileDepasire(b) ?? 0);
      return scoreB - scoreA;
    })
    .slice(0, n);
}

export interface ZiLunaDatum {
  zi: number;
  suma: number;
  trend: number;
}

/** Grupare pe ziua din luna (1-31), agregata pe TOATA perioada selectata,
 * indiferent de an/luna - ca sa vezi in ce zile din luna intra de obicei
 * banii, pe baza istoricului. Trend = medie mobila pe 3 zile, ca sa se
 * vada forma generala, nu doar zgomotul zilnic. */
export function groupByZiuaLunii(
  incasari: CreantaIncasare[],
  period: PeriodFilter,
  customRange?: { from: string; to: string; months?: string[] }
): ZiLunaDatum[] {
  const sume = Array.from({ length: 31 }, () => 0);
  for (const inc of incasari) {
    if (!dateMatchesPeriod(inc.data_incasare, period, customRange)) continue;
    const d = new Date(inc.data_incasare);
    const zi = d.getDate();
    if (zi >= 1 && zi <= 31) sume[zi - 1] += inc.valoare;
  }

  return sume.map((suma, i) => {
    const vecini = [sume[i - 1], suma, sume[i + 1]].filter((v) => v !== undefined);
    const trend = vecini.reduce((s, v) => s + v, 0) / vecini.length;
    return { zi: i + 1, suma, trend };
  });
}

import type { Creanta, CreantaIncasare } from "@/types/creante";
import {
  getCreantaStatus,
  getZileDepasire,
  matchesAgingBucket,
  type AgingBucket,
  type CreantaStatus,
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
  { key: "sold90Plus", label: "90+ zile" },
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
    const dateFrom = d.toISOString().slice(0, 10);
    const dateTo = new Date(nextMonth.getTime() - 86_400_000).toISOString().slice(0, 10);
    const label = d.toLocaleDateString("ro-RO", { month: "short", year: "2-digit" });
    months.push({ month: label, total: 0, count: 0, dateFrom, dateTo });
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

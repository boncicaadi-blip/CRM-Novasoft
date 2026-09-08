import type { CheltuialaLinie, ContractCheltuiala } from "@/types/cheltuieli";

export interface StatusDatum {
  status: string;
  count: number;
  valoare: number;
}

export function groupByStatusContract(
  linii: CheltuialaLinie[],
  contractById: Map<string, ContractCheltuiala>
): StatusDatum[] {
  const map = new Map<string, StatusDatum>();
  for (const l of linii) {
    const contract = l.contract_id ? contractById.get(l.contract_id) : undefined;
    const status = contract?.status_contract ?? "Fara contract";
    const cur = map.get(status) ?? { status, count: 0, valoare: 0 };
    cur.count += 1;
    cur.valoare += l.valoare_realizata ?? l.valoare_prognozata;
    map.set(status, cur);
  }
  return Array.from(map.values());
}

export interface GrupareDatum {
  cheie: string;
  count: number;
  estimat: number;
  realizat: number;
}

export function groupBy(linii: CheltuialaLinie[], keyFn: (l: CheltuialaLinie) => string | null): GrupareDatum[] {
  const map = new Map<string, GrupareDatum>();
  for (const l of linii) {
    const cheie = keyFn(l) ?? "Nespecificat";
    const cur = map.get(cheie) ?? { cheie, count: 0, estimat: 0, realizat: 0 };
    cur.count += 1;
    cur.estimat += l.valoare_prognozata;
    cur.realizat += l.valoare_realizata ?? 0;
    map.set(cheie, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.realizat - a.realizat);
}

export function groupByIncadrare(linii: CheltuialaLinie[]): GrupareDatum[] {
  return groupBy(linii, (l) => l.incadrare);
}

export function groupByClasa(linii: CheltuialaLinie[]): GrupareDatum[] {
  return groupBy(linii, (l) => l.clasa);
}

export function groupByFrecventa(linii: CheltuialaLinie[]): GrupareDatum[] {
  return groupBy(linii, (l) => l.frecventa);
}

export interface LunaDatum {
  luna: string;
  label: string;
  estimat: number;
  realizat: number;
}

/**
 * Genereaza intervalul de luni din datele PRIMITE (nu o fereastra fixa de la
 * data curenta) - vezi comentariul din venituri-dashboard-analytics.ts,
 * aceeasi logica, doar pentru Cheltuieli.
 */
export function buildEvolutieLunara(linii: CheltuialaLinie[], maxLuni = 36): LunaDatum[] {
  const now = new Date();

  let primaLuna: string;
  let ultimaLuna: string;

  if (linii.length === 0) {
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    primaLuna = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
    ultimaLuna = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  } else {
    const luniPrezente = linii.map((l) => l.luna.slice(0, 7)).sort();
    primaLuna = luniPrezente[0];
    ultimaLuna = luniPrezente[luniPrezente.length - 1];
  }

  const buckets: LunaDatum[] = [];
  let [y, m] = primaLuna.split("-").map(Number);
  const [yEnd, mEnd] = ultimaLuna.split("-").map(Number);
  while ((y < yEnd || (y === yEnd && m <= mEnd)) && buckets.length < maxLuni) {
    const key = `${y}-${String(m).padStart(2, "0")}`;
    const d = new Date(y, m - 1, 1);
    buckets.push({
      luna: key,
      label: d.toLocaleDateString("ro-RO", { month: "short", year: "2-digit" }),
      estimat: 0,
      realizat: 0,
    });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }

  const byKey = new Map(buckets.map((b) => [b.luna, b]));
  for (const l of linii) {
    const key = l.luna.slice(0, 7);
    const bucket = byKey.get(key);
    if (bucket) {
      bucket.estimat += l.valoare_prognozata;
      bucket.realizat += l.valoare_realizata ?? 0;
    }
  }
  return buckets;
}

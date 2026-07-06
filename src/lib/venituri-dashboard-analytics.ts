import type { VenitLinie, Contract } from "@/types/venituri";

export interface StatusDatum {
  status: string;
  count: number;
  valoare: number;
}

/** Grupeaza pe Status Contract (al contractului legat) - liniile fara
 * contract (manuale) intra la "Fara contract". */
export function groupByStatusContract(
  linii: VenitLinie[],
  contractById: Map<string, Contract>
): StatusDatum[] {
  const map = new Map<string, StatusDatum>();
  for (const l of linii) {
    const contract = l.contract_id ? contractById.get(l.contract_id) : undefined;
    const status = contract?.status_contract ?? "Fara contract";
    const cur = map.get(status) ?? { status, count: 0, valoare: 0 };
    cur.count += 1;
    cur.valoare += l.venit_realizat ?? l.venit_estimat;
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

export function groupBy(linii: VenitLinie[], keyFn: (l: VenitLinie) => string | null): GrupareDatum[] {
  const map = new Map<string, GrupareDatum>();
  for (const l of linii) {
    const cheie = keyFn(l) ?? "Nespecificat";
    const cur = map.get(cheie) ?? { cheie, count: 0, estimat: 0, realizat: 0 };
    cur.count += 1;
    cur.estimat += l.venit_estimat;
    cur.realizat += l.venit_realizat ?? 0;
    map.set(cheie, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.realizat - a.realizat);
}

export function groupByProdus(linii: VenitLinie[]): GrupareDatum[] {
  return groupBy(linii, (l) => l.produs);
}

export function groupByServiciu(linii: VenitLinie[]): GrupareDatum[] {
  return groupBy(linii, (l) => l.serviciu);
}

export function groupByTipVenit(linii: VenitLinie[]): GrupareDatum[] {
  return groupBy(linii, (l) => l.tip_venit);
}

export function topClienti(linii: VenitLinie[], n = 10): GrupareDatum[] {
  return groupBy(linii, (l) => l.nume_client).slice(0, n);
}

export interface LunaDatum {
  luna: string;
  label: string;
  estimat: number;
  realizat: number;
}

export function buildEvolutieLunara(linii: VenitLinie[], luni = 15): LunaDatum[] {
  const now = new Date();
  const buckets: LunaDatum[] = [];
  for (let i = luni - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({
      luna: key,
      label: d.toLocaleDateString("ro-RO", { month: "short", year: "2-digit" }),
      estimat: 0,
      realizat: 0,
    });
  }
  const byKey = new Map(buckets.map((b) => [b.luna, b]));
  for (const l of linii) {
    const key = l.luna.slice(0, 7);
    const bucket = byKey.get(key);
    if (bucket) {
      bucket.estimat += l.venit_estimat;
      bucket.realizat += l.venit_realizat ?? 0;
    }
  }
  return buckets;
}

export interface JudetVenitDatum {
  judet: string;
  count: number;
  arr: number;
  forecast: number;
}

/** Grupare pe judet, in formatul asteptat de RomaniaMap (acelasi shape ca la
 * Pipeline - "arr" = venit realizat, "forecast" = venit estimat, refolosite
 * ca nume de camp pentru compatibilitate directa cu harta existenta). */
export function groupByJudetVenituri(
  linii: VenitLinie[],
  partnerJudetById: Map<string, string | null>
): JudetVenitDatum[] {
  const map = new Map<string, JudetVenitDatum>();
  for (const l of linii) {
    const judet = (l.partner_id ? partnerJudetById.get(l.partner_id) : null) ?? "Necunoscut";
    const entry = map.get(judet) ?? { judet, count: 0, arr: 0, forecast: 0 };
    entry.count += 1;
    entry.arr += l.venit_realizat ?? 0;
    entry.forecast += l.venit_estimat;
    map.set(judet, entry);
  }
  return Array.from(map.values());
}

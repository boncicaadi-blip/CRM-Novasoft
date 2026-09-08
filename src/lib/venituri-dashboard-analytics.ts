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
    if (l.venit_realizat !== null) cur.valoare += l.venit_realizat;
    else if (!l.mutat_in_linie_id) cur.valoare += l.venit_estimat;
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
    if (!l.mutat_in_linie_id) cur.estimat += l.venit_estimat;
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

/** Top N clienti dupa valoare. Daca groupMap e dat, firmele cu grup completat (Setari -> Parteneri) se agrega sub numele grupului. */
export function topClienti(linii: VenitLinie[], n = 10, groupMap?: Record<string, string>): GrupareDatum[] {
  return groupBy(linii, (l) => (l.partner_id && groupMap?.[l.partner_id]) || l.nume_client).slice(0, n);
}

export interface LunaDatum {
  luna: string;
  label: string;
  estimat: number;
  realizat: number;
}

/**
 * Genereaza intervalul de luni din datele PRIMITE (nu o fereastra fixa de la
 * data curenta) - altfel graficul arata mereu ultimele N luni de azi
 * inapoi, chiar daca ai filtrat pe un an anume: intervalul afisat trebuie
 * sa reflecte exact ce ai selectat sus, nu sa ramana "agatat" de azi.
 * Daca nu exista date, cade pe o fereastra implicita rezonabila (ultimele
 * 12 luni), ca sa nu arate un grafic complet gol fara niciun motiv vizibil.
 */
export function buildEvolutieLunara(linii: VenitLinie[], maxLuni = 36): LunaDatum[] {
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
      if (!l.mutat_in_linie_id) bucket.estimat += l.venit_estimat;
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
    if (!l.mutat_in_linie_id) entry.forecast += l.venit_estimat;
    map.set(judet, entry);
  }
  return Array.from(map.values());
}

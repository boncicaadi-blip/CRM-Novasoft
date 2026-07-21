import type { Creanta, CreantaIncasare } from "@/types/creante";
import type { Obligatie, ObligatiePlata } from "@/types/obligatii";

export interface CashflowMonthKey {
  luna: string; // "2026-07"
  label: string; // "iul. 26"
}

export interface CashflowValoare {
  incasari: number;
  plati: number;
  net: number;
}

export interface CashflowReport {
  luni: CashflowMonthKey[];
  realizat: Record<string, CashflowValoare>;
  estimat: Record<string, CashflowValoare>;
  totalRealizat: CashflowValoare;
  totalEstimat: CashflowValoare;
}

export function buildCashflowMonthKeys(from: Date, to: Date): CashflowMonthKey[] {
  const luni: CashflowMonthKey[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= end) {
    luni.push({
      luna: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
      label: cursor.toLocaleDateString("ro-RO", { month: "short", year: "2-digit" }),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return luni;
}

function emptyValoare(): CashflowValoare {
  return { incasari: 0, plati: 0, net: 0 };
}

function lunaKeyOf(dateStr: string): string {
  return dateStr.slice(0, 7);
}

/**
 * Construieste raportul de cashflow (Incasari, Plati, Net), separat pentru
 * Realizat (incasari/plati efective, cu data reala) si Estimat (sold
 * neincasat/neplatit, grupat dupa data scadentei).
 *
 * Facturile restante (scadenta deja trecuta, dar neincasate/neplatite inca)
 * sunt "mutate" automat in luna curenta pentru Estimat - altfel ar disparea
 * din raport sau ar strica lunile trecute care deja au fost afisate.
 *
 * Nu calculeaza sold cumulat - doar flux net, independent pe fiecare luna
 * (simplu, fara nevoie de un sold initial de pornire).
 */
export function buildCashflowReport(
  creante: Creanta[],
  obligatii: Obligatie[],
  incasariByCreanta: Record<string, CreantaIncasare[]>,
  platiByObligatie: Record<string, ObligatiePlata[]>,
  from: Date,
  to: Date
): CashflowReport {
  const luni = buildCashflowMonthKeys(from, to);
  const lunaSet = new Set(luni.map((l) => l.luna));

  const realizat: Record<string, CashflowValoare> = Object.fromEntries(luni.map((l) => [l.luna, emptyValoare()]));
  const estimat: Record<string, CashflowValoare> = Object.fromEntries(luni.map((l) => [l.luna, emptyValoare()]));

  // --- Realizat: incasari/plati efective, dupa data reala a operatiunii ---
  for (const lista of Object.values(incasariByCreanta)) {
    for (const inc of lista) {
      const key = lunaKeyOf(inc.data_incasare);
      if (!lunaSet.has(key)) continue;
      realizat[key].incasari += inc.valoare;
    }
  }
  for (const lista of Object.values(platiByObligatie)) {
    for (const plata of lista) {
      const key = lunaKeyOf(plata.data_plata);
      if (!lunaSet.has(key)) continue;
      realizat[key].plati += plata.valoare;
    }
  }
  for (const luna of luni) {
    realizat[luna.luna].net = realizat[luna.luna].incasari - realizat[luna.luna].plati;
  }

  // --- Estimat: sold neincasat/neplatit, grupat dupa scadenta (restantele
  // se muta in prima luna afisata, ca sa nu dispara din calcul) ---
  const primaLuna = luni[0]?.luna;

  function bucketLuna(dataScadenta: string | null): string | null {
    if (!dataScadenta || !primaLuna) return primaLuna ?? null;
    const key = lunaKeyOf(dataScadenta);
    if (key < primaLuna) return primaLuna; // restanta - mutata in prima luna afisata
    return lunaSet.has(key) ? key : null; // in afara perioadei afisate - ignorata
  }

  for (const c of creante) {
    if (!c.sold || c.sold <= 0) continue;
    const key = bucketLuna(c.data_scadenta);
    if (!key) continue;
    estimat[key].incasari += c.sold;
  }
  for (const o of obligatii) {
    if (!o.sold || o.sold <= 0) continue;
    const key = bucketLuna(o.data_scadenta);
    if (!key) continue;
    estimat[key].plati += o.sold;
  }
  for (const luna of luni) {
    estimat[luna.luna].net = estimat[luna.luna].incasari - estimat[luna.luna].plati;
  }

  const totalRealizat = luni.reduce(
    (acc, l) => ({
      incasari: acc.incasari + realizat[l.luna].incasari,
      plati: acc.plati + realizat[l.luna].plati,
      net: acc.net + realizat[l.luna].net,
    }),
    emptyValoare()
  );
  const totalEstimat = luni.reduce(
    (acc, l) => ({
      incasari: acc.incasari + estimat[l.luna].incasari,
      plati: acc.plati + estimat[l.luna].plati,
      net: acc.net + estimat[l.luna].net,
    }),
    emptyValoare()
  );

  return { luni, realizat, estimat, totalRealizat, totalEstimat };
}

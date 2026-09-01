import type { VenitLinie } from "@/types/venituri";
import type { CheltuialaLinie } from "@/types/cheltuieli";

export interface ManagementMonthDatum {
  luna: string;
  label: string;
  venitEstimat: number;
  venitRealizat: number;
  venitRecurentRealizat: number;
  cheltuieliEstimat: number;
  cheltuieliRealizat: number;
  nrAngajati: number | null;
}

export function buildManagementMonthly(
  venituriLinii: VenitLinie[],
  cheltuieliLinii: CheltuialaLinie[],
  angajatiLookup: Map<string, number>,
  from: Date,
  to: Date
): ManagementMonthDatum[] {
  const buckets: ManagementMonthDatum[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= end) {
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    buckets.push({
      luna: key,
      label: cursor.toLocaleDateString("ro-RO", { month: "short", year: "2-digit" }),
      venitEstimat: 0,
      venitRealizat: 0,
      venitRecurentRealizat: 0,
      cheltuieliEstimat: 0,
      cheltuieliRealizat: 0,
      nrAngajati: angajatiLookup.get(key) ?? null,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  const byKey = new Map(buckets.map((b) => [b.luna, b]));

  for (const l of venituriLinii) {
    const bucket = byKey.get(l.luna.slice(0, 7));
    if (!bucket) continue;
    if (!l.mutat_in_linie_id) bucket.venitEstimat += l.venit_estimat;
    bucket.venitRealizat += l.venit_realizat ?? 0;
    if (l.tip_venit === "Recurent") bucket.venitRecurentRealizat += l.venit_realizat ?? 0;
  }
  for (const l of cheltuieliLinii) {
    const bucket = byKey.get(l.luna.slice(0, 7));
    if (!bucket) continue;
    bucket.cheltuieliEstimat += l.valoare_prognozata;
    bucket.cheltuieliRealizat += l.valoare_realizata ?? 0;
  }

  return buckets;
}

export interface ManagementSummary {
  venitEstimat: number;
  venitRealizat: number;
  cheltuieliEstimat: number;
  cheltuieliRealizat: number;
  profitEstimat: number;
  profitRealizat: number;
  productivitateMedieRealizat: number | null;
  costPerAngajatMediuRealizat: number | null;
}

/** Sumar pe un set de luni (de obicei anul curent) - profitul e simplificat
 * (Venit - Cheltuieli, fara distinctie Net/Brut momentan). Productivitatea
 * si costul per angajat se calculeaza doar pe lunile care AU numar de
 * angajati completat, ca sa nu distorsioneze media lunile necompletate. */
export function computeManagementSummary(months: ManagementMonthDatum[]): ManagementSummary {
  let venitEstimat = 0;
  let venitRealizat = 0;
  let cheltuieliEstimat = 0;
  let cheltuieliRealizat = 0;
  let sumaProductivitate = 0;
  let sumaCostPerAngajat = 0;
  let nrLuniCuAngajati = 0;

  for (const m of months) {
    venitEstimat += m.venitEstimat;
    venitRealizat += m.venitRealizat;
    cheltuieliEstimat += m.cheltuieliEstimat;
    cheltuieliRealizat += m.cheltuieliRealizat;
    if (m.nrAngajati && m.nrAngajati > 0) {
      sumaProductivitate += m.venitRealizat / m.nrAngajati;
      sumaCostPerAngajat += m.cheltuieliRealizat / m.nrAngajati;
      nrLuniCuAngajati += 1;
    }
  }

  return {
    venitEstimat,
    venitRealizat,
    cheltuieliEstimat,
    cheltuieliRealizat,
    profitEstimat: venitEstimat - cheltuieliEstimat,
    profitRealizat: venitRealizat - cheltuieliRealizat,
    productivitateMedieRealizat: nrLuniCuAngajati > 0 ? sumaProductivitate / nrLuniCuAngajati : null,
    costPerAngajatMediuRealizat: nrLuniCuAngajati > 0 ? sumaCostPerAngajat / nrLuniCuAngajati : null,
  };
}

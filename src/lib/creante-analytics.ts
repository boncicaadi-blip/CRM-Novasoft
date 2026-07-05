import type { Creanta, CreantaIncasare } from "@/types/creante";
import { getTodayISO } from "@/lib/date";

export type CreantaStatus = "incasata" | "restanta" | "la_zi";

export function getCreantaStatus(c: Creanta): CreantaStatus {
  if (c.sold <= 0) return "incasata";
  if (c.data_scadenta && c.data_scadenta < getTodayISO()) {
    return "restanta";
  }
  return "la_zi";
}

export function getZileDepasire(c: Creanta): number | null {
  if (c.sold <= 0 || !c.data_scadenta) return null;
  const today = new Date(`${getTodayISO()}T00:00:00Z`);
  const scadenta = new Date(`${c.data_scadenta.slice(0, 10)}T00:00:00Z`);
  const zile = Math.floor((today.getTime() - scadenta.getTime()) / 86_400_000);
  return zile > 0 ? zile : null;
}

/** Valoarea propusa efectiva - cea editata manual, sau soldul intreg daca
 * n-a fost inca editata (ex: factura tocmai bifata "Propus"). */
export function getValoarePropusa(c: Creanta): number {
  if (!c.propus_spre_incasare || c.sold <= 0) return 0;
  return c.valoare_propusa_spre_incasare ?? c.sold;
}

/** True daca factura e propusa spre incasare pentru MAI PUTIN decat soldul
 * integral - util ca sa le poti gasi usor printre multe altele. */
export function isPartialPropus(c: Creanta): boolean {
  if (!c.propus_spre_incasare || c.sold <= 0) return false;
  return c.valoare_propusa_spre_incasare !== null && c.valoare_propusa_spre_incasare < c.sold;
}

export type AgingBucket =
  | "sold0_30"
  | "sold31_60"
  | "sold61_90"
  | "sold91_180"
  | "sold181_365"
  | "sold365Plus";

/** In ce "bucket" de vechime cade o factura - doar facturile chiar
 * restante (scadenta depasita) intra intr-un bucket de aging. O factura
 * "la zi" (nu e inca scadenta) nu are varsta de intarziere, deci nu apare
 * in niciun bucket. */
export function matchesAgingBucket(c: Creanta, bucket: AgingBucket): boolean {
  if (c.sold <= 0) return false;
  if (getCreantaStatus(c) !== "restanta") return false;
  const zile = getZileDepasire(c) ?? 0;
  if (bucket === "sold0_30") return zile <= 30;
  if (bucket === "sold31_60") return zile > 30 && zile <= 60;
  if (bucket === "sold61_90") return zile > 60 && zile <= 90;
  if (bucket === "sold91_180") return zile > 90 && zile <= 180;
  if (bucket === "sold181_365") return zile > 180 && zile <= 365;
  return zile > 365;
}

export interface CreanteSummary {
  /** Tot ce nu e incasat, indiferent daca e deja scadent sau nu. */
  totalSoldNeincasat: number;
  /** Doar ce e cu adevarat restant (scadenta depasita) - pentru cardul
   * "Sold total restant" si pentru aging. Calculat mereu pe TOATE facturile,
   * indiferent de filtrul de perioada - e o stare curenta, nu una istorica. */
  totalSoldRestant: number;
  totalFacturat: number;
  nrFacturiRestante: number;
  nrFacturiLaZi: number;
  sold0_30: number;
  sold31_60: number;
  sold61_90: number;
  sold91_180: number;
  sold181_365: number;
  sold365Plus: number;
  /** Suma valorilor propuse (editabile per factura, nu neaparat soldul intreg). */
  targetPropus: number;
  nrFacturiPropuse: number;
}

/**
 * Calculeaza sumarul de Creante - se aplica mereu pe TOATE facturile
 * (neinfluentat de filtrul de perioada din UI), pentru ca sold-ul restant,
 * facturile restante si targetul propus sunt stari curente ("cat am acum
 * neincasat/restant/propus"), nu valori istorice legate de o perioada.
 * Singurul lucru cu adevarat "legat de o perioada" e Total incasat, care se
 * calculeaza separat, din jurnalul de incasari (vezi computeTotalIncasatInPeriod).
 */
export function computeCreanteSummary(creante: Creanta[]): CreanteSummary {
  let totalSoldNeincasat = 0;
  let totalSoldRestant = 0;
  let totalFacturat = 0;
  let nrFacturiRestante = 0;
  let nrFacturiLaZi = 0;
  let sold0_30 = 0;
  let sold31_60 = 0;
  let sold61_90 = 0;
  let sold91_180 = 0;
  let sold181_365 = 0;
  let sold365Plus = 0;
  let targetPropus = 0;
  let nrFacturiPropuse = 0;

  for (const c of creante) {
    totalFacturat += c.total_factura;
    if (c.propus_spre_incasare && c.sold > 0) {
      targetPropus += getValoarePropusa(c);
      nrFacturiPropuse += 1;
    }
    if (c.sold <= 0) continue;

    totalSoldNeincasat += c.sold;
    const status = getCreantaStatus(c);

    if (status === "restanta") {
      const zile = getZileDepasire(c) ?? 0;
      totalSoldRestant += c.sold;
      nrFacturiRestante += 1;
      if (zile <= 30) sold0_30 += c.sold;
      else if (zile <= 60) sold31_60 += c.sold;
      else if (zile <= 90) sold61_90 += c.sold;
      else if (zile <= 180) sold91_180 += c.sold;
      else if (zile <= 365) sold181_365 += c.sold;
      else sold365Plus += c.sold;
    } else {
      nrFacturiLaZi += 1;
    }
  }

  return {
    totalSoldNeincasat,
    totalSoldRestant,
    totalFacturat,
    nrFacturiRestante,
    nrFacturiLaZi,
    sold0_30,
    sold31_60,
    sold61_90,
    sold91_180,
    sold181_365,
    sold365Plus,
    targetPropus,
    nrFacturiPropuse,
  };
}

/**
 * Total incasat INTR-O PERIOADA - spre deosebire de restul sumarului, asta
 * chiar trebuie sa raspunda la filtrul de perioada, dar dupa DATA INCASARII
 * (cand a intrat banul), nu dupa data facturii. Se calculeaza din jurnalul
 * de incasari, nu din facturi - o factura din martie incasata in iunie
 * conteaza la "iunie", nu la "martie".
 */
export function computeTotalIncasatInPeriod(
  incasari: CreantaIncasare[],
  period: PeriodFilter,
  customRange?: { from: string; to: string }
): number {
  return incasari
    .filter((i) => dateMatchesPeriod(i.data_incasare, period, customRange))
    .reduce((sum, i) => sum + i.valoare, 0);
}

export type PeriodFilter = "luna_curenta" | "ultimele_3_luni" | "anul_curent" | "toate" | "custom";

export function dateMatchesPeriod(
  dateStr: string | null,
  period: PeriodFilter,
  customRange?: { from: string; to: string }
): boolean {
  if (period === "toate") return true;
  if (!dateStr) return false;

  const d = new Date(dateStr);
  const now = new Date();

  if (period === "custom") {
    if (customRange?.from && d < new Date(customRange.from)) return false;
    if (customRange?.to && d > new Date(customRange.to)) return false;
    return true;
  }
  if (period === "luna_curenta") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (period === "anul_curent") {
    return d.getFullYear() === now.getFullYear();
  }
  if (period === "ultimele_3_luni") {
    const threshold = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const sfarsitLunaCurenta = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return d >= threshold && d <= sfarsitLunaCurenta;
  }
  return true;
}

/**
 * Filtrare pe perioada PENTRU LISTA DE FACTURI (nu pentru sumar): o factura
 * e vizibila daca are sold restant (indiferent de vechime - trebuie
 * urmarita oricum), SAU daca data facturii cade in perioada selectata.
 */
export function inPeriod(
  c: Creanta,
  period: PeriodFilter,
  customRange?: { from: string; to: string }
): boolean {
  if (c.sold > 0) return true;
  return dateMatchesPeriod(c.data_factura, period, customRange);
}

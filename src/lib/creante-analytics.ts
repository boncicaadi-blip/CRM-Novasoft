import type { Creanta } from "@/types/creante";

export type CreantaStatus = "incasata" | "restanta" | "la_zi";

export function getCreantaStatus(c: Creanta): CreantaStatus {
  if (c.sold <= 0) return "incasata";
  if (c.data_scadenta && new Date(c.data_scadenta) < new Date(new Date().toDateString())) {
    return "restanta";
  }
  return "la_zi";
}

export function getZileDepasire(c: Creanta): number | null {
  if (c.sold <= 0 || !c.data_scadenta) return null;
  const zile = Math.floor(
    (new Date(new Date().toDateString()).getTime() - new Date(c.data_scadenta).getTime()) /
      86_400_000
  );
  return zile > 0 ? zile : null;
}

export type AgingBucket = "sold0_30" | "sold31_60" | "sold61_90" | "sold90Plus";

/** In ce "bucket" de vechime cade o factura - aceeasi logica folosita si la
 * calculul sumelor din AgingBar, ca cele doua sa ramana mereu consistente. */
export function matchesAgingBucket(c: Creanta, bucket: AgingBucket): boolean {
  if (c.sold <= 0) return false;
  const status = getCreantaStatus(c);
  if (status !== "restanta") return bucket === "sold0_30";
  const zile = getZileDepasire(c) ?? 0;
  if (bucket === "sold0_30") return zile <= 30;
  if (bucket === "sold31_60") return zile > 30 && zile <= 60;
  if (bucket === "sold61_90") return zile > 60 && zile <= 90;
  return zile > 90;
}

export interface CreanteSummary {
  totalSold: number;
  totalFacturat: number;
  totalIncasat: number;
  nrFacturiRestante: number;
  nrFacturiLaZi: number;
  sold0_30: number;
  sold31_60: number;
  sold61_90: number;
  sold90Plus: number;
  /** Suma soldurilor facturilor bifate "Propus spre incasare" - targetul curent. */
  targetPropus: number;
  nrFacturiPropuse: number;
}

export function computeCreanteSummary(creante: Creanta[]): CreanteSummary {
  let totalSold = 0;
  let totalFacturat = 0;
  let totalIncasat = 0;
  let nrFacturiRestante = 0;
  let nrFacturiLaZi = 0;
  let sold0_30 = 0;
  let sold31_60 = 0;
  let sold61_90 = 0;
  let sold90Plus = 0;
  let targetPropus = 0;
  let nrFacturiPropuse = 0;

  for (const c of creante) {
    totalFacturat += c.total_factura;
    totalIncasat += c.valoare_incasata;
    if (c.propus_spre_incasare && c.sold > 0) {
      targetPropus += c.sold;
      nrFacturiPropuse += 1;
    }
    if (c.sold <= 0) continue;

    totalSold += c.sold;
    const status = getCreantaStatus(c);
    const zile = getZileDepasire(c) ?? 0;

    if (status === "restanta") {
      nrFacturiRestante += 1;
      if (zile <= 30) sold0_30 += c.sold;
      else if (zile <= 60) sold31_60 += c.sold;
      else if (zile <= 90) sold61_90 += c.sold;
      else sold90Plus += c.sold;
    } else {
      nrFacturiLaZi += 1;
      sold0_30 += c.sold;
    }
  }

  return {
    totalSold,
    totalFacturat,
    totalIncasat,
    nrFacturiRestante,
    nrFacturiLaZi,
    sold0_30,
    sold31_60,
    sold61_90,
    sold90Plus,
    targetPropus,
    nrFacturiPropuse,
  };
}

export type PeriodFilter = "luna_curenta" | "ultimele_3_luni" | "anul_curent" | "toate" | "custom";

/**
 * Filtrare pe perioada: o factura e vizibila daca are sold restant
 * (indiferent de vechime - trebuie urmarita oricum), SAU daca data
 * facturii cade in perioada selectata.
 */
export function inPeriod(
  c: Creanta,
  period: PeriodFilter,
  customRange?: { from: string; to: string }
): boolean {
  if (c.sold > 0) return true;
  if (period === "toate") return true;
  if (!c.data_factura) return false;

  const d = new Date(c.data_factura);
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
    return d >= threshold;
  }
  return true;
}

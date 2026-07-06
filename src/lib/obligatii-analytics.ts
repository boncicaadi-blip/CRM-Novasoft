import type { Obligatie, ObligatiePlata } from "@/types/obligatii";
import { getTodayISO } from "@/lib/date";

export type ObligatieStatus = "platita" | "restanta" | "la_zi";

export function getObligatieStatus(o: Obligatie): ObligatieStatus {
  if (o.sold <= 0) return "platita";
  if (o.data_scadenta && o.data_scadenta < getTodayISO()) {
    return "restanta";
  }
  return "la_zi";
}

export function getZileDepasireObligatie(o: Obligatie): number | null {
  if (o.sold <= 0 || !o.data_scadenta) return null;
  const today = new Date(`${getTodayISO()}T00:00:00Z`);
  const scadenta = new Date(`${o.data_scadenta.slice(0, 10)}T00:00:00Z`);
  const zile = Math.floor((today.getTime() - scadenta.getTime()) / 86_400_000);
  return zile > 0 ? zile : null;
}

export function getValoarePropusaObligatie(o: Obligatie): number {
  if (!o.propus_spre_plata || o.sold <= 0) return 0;
  return o.valoare_propusa_spre_plata ?? o.sold;
}

/** True daca factura e propusa spre plata pentru mai putin decat soldul
 * integral - util pentru identificarea rapida a propunerilor partiale. */
export function isPartialPropusObligatie(o: Obligatie): boolean {
  if (!o.propus_spre_plata || o.sold <= 0) return false;
  const propusa = o.valoare_propusa_spre_plata ?? o.sold;
  return propusa < o.sold;
}

export type AgingBucketObligatie =
  | "sold0_30"
  | "sold31_60"
  | "sold61_90"
  | "sold91_180"
  | "sold181_365"
  | "sold365Plus";

export function matchesAgingBucketObligatie(o: Obligatie, bucket: AgingBucketObligatie): boolean {
  if (o.sold <= 0) return false;
  if (getObligatieStatus(o) !== "restanta") return false;
  const zile = getZileDepasireObligatie(o) ?? 0;
  if (bucket === "sold0_30") return zile <= 30;
  if (bucket === "sold31_60") return zile > 30 && zile <= 60;
  if (bucket === "sold61_90") return zile > 60 && zile <= 90;
  if (bucket === "sold91_180") return zile > 90 && zile <= 180;
  if (bucket === "sold181_365") return zile > 180 && zile <= 365;
  return zile > 365;
}

export interface ObligatiiSummary {
  totalSoldNeplatit: number;
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
  targetPropus: number;
  nrFacturiPropuse: number;
}

/** La fel ca la Creante: sumarul reflecta mereu starea curenta pe TOATE
 * facturile, nu e filtrat de perioada - doar Total platit e legat de perioada
 * (vezi computeTotalPlatitInPeriod). */
export function computeObligatiiSummary(obligatii: Obligatie[]): ObligatiiSummary {
  let totalSoldNeplatit = 0;
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

  for (const o of obligatii) {
    totalFacturat += o.total_factura;
    if (o.propus_spre_plata && o.sold > 0) {
      targetPropus += getValoarePropusaObligatie(o);
      nrFacturiPropuse += 1;
    }
    if (o.sold <= 0) continue;

    totalSoldNeplatit += o.sold;
    const status = getObligatieStatus(o);

    if (status === "restanta") {
      const zile = getZileDepasireObligatie(o) ?? 0;
      totalSoldRestant += o.sold;
      nrFacturiRestante += 1;
      if (zile <= 30) sold0_30 += o.sold;
      else if (zile <= 60) sold31_60 += o.sold;
      else if (zile <= 90) sold61_90 += o.sold;
      else if (zile <= 180) sold91_180 += o.sold;
      else if (zile <= 365) sold181_365 += o.sold;
      else sold365Plus += o.sold;
    } else {
      nrFacturiLaZi += 1;
    }
  }

  return {
    totalSoldNeplatit,
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

export function computeTotalPlatitInPeriod(
  plati: ObligatiePlata[],
  period: PeriodFilter,
  customRange?: { from: string; to: string }
): number {
  return plati
    .filter((p) => dateMatchesPeriod(p.data_plata, period, customRange))
    .reduce((sum, p) => sum + p.valoare, 0);
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
 * Filtrare pe perioada, strict dupa data facturii - vezi explicatia din
 * creante-analytics.ts (acelasi fix acolo si aici).
 */
export function inPeriodObligatie(
  o: Obligatie,
  period: PeriodFilter,
  customRange?: { from: string; to: string }
): boolean {
  return dateMatchesPeriod(o.data_factura, period, customRange);
}

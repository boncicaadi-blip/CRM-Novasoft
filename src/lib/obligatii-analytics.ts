import type { Obligatie } from "@/types/obligatii";
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

export type AgingBucketObligatie = "sold0_30" | "sold31_60" | "sold61_90" | "sold90Plus";

/** Doar facturile chiar restante (scadenta depasita) intra intr-un bucket
 * de aging - o factura "la zi" nu are varsta de intarziere. */
export function matchesAgingBucketObligatie(o: Obligatie, bucket: AgingBucketObligatie): boolean {
  if (o.sold <= 0) return false;
  if (getObligatieStatus(o) !== "restanta") return false;
  const zile = getZileDepasireObligatie(o) ?? 0;
  if (bucket === "sold0_30") return zile <= 30;
  if (bucket === "sold31_60") return zile > 30 && zile <= 60;
  if (bucket === "sold61_90") return zile > 60 && zile <= 90;
  return zile > 90;
}

export interface ObligatiiSummary {
  /** Tot ce nu e platit, indiferent daca e deja scadent sau nu. */
  totalSoldNeplatit: number;
  /** Doar ce e cu adevarat restant (scadenta depasita). */
  totalSoldRestant: number;
  totalFacturat: number;
  totalPlatit: number;
  nrFacturiRestante: number;
  nrFacturiLaZi: number;
  sold0_30: number;
  sold31_60: number;
  sold61_90: number;
  sold90Plus: number;
  targetPropus: number;
  nrFacturiPropuse: number;
}

export function computeObligatiiSummary(obligatii: Obligatie[]): ObligatiiSummary {
  let totalSoldNeplatit = 0;
  let totalSoldRestant = 0;
  let totalFacturat = 0;
  let totalPlatit = 0;
  let nrFacturiRestante = 0;
  let nrFacturiLaZi = 0;
  let sold0_30 = 0;
  let sold31_60 = 0;
  let sold61_90 = 0;
  let sold90Plus = 0;
  let targetPropus = 0;
  let nrFacturiPropuse = 0;

  for (const o of obligatii) {
    totalFacturat += o.total_factura;
    totalPlatit += o.valoare_platita;
    if (o.propus_spre_plata && o.sold > 0) {
      targetPropus += o.sold;
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
      else sold90Plus += o.sold;
    } else {
      nrFacturiLaZi += 1;
    }
  }

  return {
    totalSoldNeplatit,
    totalSoldRestant,
    totalFacturat,
    totalPlatit,
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

export function inPeriodObligatie(
  o: Obligatie,
  period: PeriodFilter,
  customRange?: { from: string; to: string }
): boolean {
  if (o.sold > 0) return true;
  if (period === "toate") return true;
  if (!o.data_factura) return false;

  const d = new Date(o.data_factura);
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

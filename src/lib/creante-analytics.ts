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

  for (const c of creante) {
    totalFacturat += c.total_factura;
    totalIncasat += c.valoare_incasata;
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
  };
}

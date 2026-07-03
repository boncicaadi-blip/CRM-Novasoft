export type ComportamentPlata = "Bun platnic" | "Platnic mediu" | "Rau platnic";
export type TipVanzare = "Recurente" | "Nerecurente";

export interface Creanta {
  id: string;
  nr_factura: string;
  nume_firma: string;
  opportunity_id: string | null;
  data_factura: string | null;
  data_scadenta: string | null;
  nr_contract: string | null;
  data_contract: string | null;
  produs: string | null;
  serviciu_facturat: string | null;
  tip_vanzare: TipVanzare | null;
  termen_incasare_zile: number | null;
  valoare_lunara_fara_tva: number | null;
  total_fara_tva: number | null;
  total_tva: number | null;
  total_factura: number;
  valoare_incasata: number;
  data_incasare: string | null;
  sold: number;
  propus_spre_incasare: boolean;
  valoare_propusa_spre_incasare: number | null;
  comportament_plata: ComportamentPlata | null;
  data_tinta_incasare: string | null;
  observatii: string | null;
  creat_la: string;
  actualizat_la: string;
}

export interface CreanteImportBatch {
  id: string;
  fisier_nume: string | null;
  nr_facturi_noi: number;
  nr_facturi_actualizate: number;
  importat_de: string | null;
  importat_la: string;
}

export interface CreantaIncasare {
  id: string;
  creanta_id: string;
  valoare: number;
  data_incasare: string;
  observatie: string | null;
  creat_de: string | null;
  creat_la: string;
}

export interface CreanteTargetLunar {
  id: string;
  luna: string;
  target: number;
  creat_la: string;
  actualizat_la: string;
}

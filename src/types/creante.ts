export type ComportamentPlata = "Bun platnic" | "Platnic mediu" | "Rau platnic";

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
  termen_incasare_zile: number | null;
  valoare_lunara_fara_tva: number | null;
  total_fara_tva: number | null;
  total_tva: number | null;
  total_factura: number;
  valoare_incasata: number;
  data_incasare: string | null;
  sold: number;
  comportament_plata: ComportamentPlata | null;
  grad_dificultate_incasare: string | null;
  data_tinta_incasare: string | null;
  observatii: string | null;
  datorie_operationala: boolean;
  departament_datorie_operationala: string | null;
  procent_penalitate_intarziere: number | null;
  valoare_penalitati_intarziere: number | null;
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

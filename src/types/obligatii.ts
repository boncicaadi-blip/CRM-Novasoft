export type TipAchizitie = "Recurente" | "Nerecurente";

export interface Obligatie {
  id: string;
  nr_factura: string;
  nume_furnizor: string;
  cif_furnizor: string | null;
  data_factura: string | null;
  data_scadenta: string | null;
  serviciu_facturat: string | null;
  tip_achizitie: TipAchizitie | null;
  modalitate_plata: string | null;
  responsabil_achizitie: string | null;
  total_factura: number;
  valoare_platita: number;
  data_plata: string | null;
  sold: number;
  propus_spre_plata: boolean;
  valoare_propusa_spre_plata: number | null;
  observatii: string | null;
  creat_la: string;
  actualizat_la: string;
}

export interface ObligatiiImportBatch {
  id: string;
  fisier_nume: string | null;
  nr_facturi_noi: number;
  nr_facturi_actualizate: number;
  importat_de: string | null;
  importat_la: string;
}

export interface ObligatiePlata {
  id: string;
  obligatie_id: string;
  valoare: number;
  data_plata: string;
  observatie: string | null;
  creat_de: string | null;
  creat_la: string;
}

export interface ObligatiiTargetLunar {
  id: string;
  luna: string;
  target: number;
  creat_la: string;
  actualizat_la: string;
}

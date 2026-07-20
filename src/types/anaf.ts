export interface AnafFactura {
  id: string;
  mesaj_id_anaf: string;
  tip: "emisa" | "primita";
  cui_partener: string | null;
  nume_partener: string | null;
  nr_factura: string | null;
  data_factura: string | null;
  valoare: number | null;
  moneda: string;
  storage_path: string | null;
  stare: "noua" | "potrivita" | "importata" | "ignorata";
  creanta_id: string | null;
  obligatie_id: string | null;
  descarcat_la: string;
}

export interface AnafConnectionStatus {
  /** True daca exista un access_token salvat (conexiunea a fost facuta cel putin o data). */
  connected: boolean;
  /** True daca Client ID a fost completat in Setari -> Integrari (indiferent daca s-a conectat deja). */
  clientIdSet: boolean;
  connectedAt: string | null;
  expiresAt: string | null;
  cif: string | null;
}

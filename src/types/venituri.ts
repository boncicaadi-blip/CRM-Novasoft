export type ContractStatus = "Activ" | "Inactiv";
export type TipVenit = "Recurent" | "Nerecurent";

export interface Contract {
  id: string;
  partner_id: string | null;
  opportunity_id: string | null;
  nume_client: string;
  tip_venit: TipVenit;
  produs: string | null;
  serviciu: string | null;
  valoare_lunara: number;
  nr_rate: number;
  data_inceput: string;
  data_sfarsit: string | null;
  status_contract: ContractStatus;
  stadiu_contract: string | null;
  modalitate_facturare: string | null;
  observatii: string | null;
  creat_la: string;
  actualizat_la: string;
}

export interface VenitLinie {
  id: string;
  contract_id: string | null;
  partner_id: string | null;
  nume_client: string;
  tip_venit: TipVenit;
  produs: string | null;
  serviciu: string | null;
  luna: string;
  venit_estimat: number;
  venit_realizat: number | null;
  facturat: boolean;
  mutat_in_linie_id: string | null;
  observatii: string | null;
  creat_la: string;
  actualizat_la: string;
}

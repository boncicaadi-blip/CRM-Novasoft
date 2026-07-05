export type StatusContractCheltuiala = "Activ" | "Inactiv";
export type TipCheltuiala = "Fixe" | "Variabile";
export type FrecventaCheltuiala = "Recurenta" | "Nerecurenta";

export interface ContractCheltuiala {
  id: string;
  furnizor: string | null;
  incadrare: string;
  clasa: string;
  detaliu: string | null;
  tip_cheltuiala: TipCheltuiala;
  frecventa: FrecventaCheltuiala;
  investitie: boolean;
  repartizare: boolean;
  valoare_lunara: number;
  nr_rate: number;
  data_inceput: string;
  data_sfarsit: string | null;
  status_contract: StatusContractCheltuiala;
  observatii: string | null;
  creat_la: string;
  actualizat_la: string;
}

export interface CheltuialaLinie {
  id: string;
  contract_id: string | null;
  furnizor: string | null;
  incadrare: string;
  clasa: string;
  detaliu: string | null;
  frecventa: FrecventaCheltuiala;
  luna: string;
  valoare_prognozata: number;
  valoare_realizata: number | null;
  platit: boolean;
  observatii: string | null;
  creat_la: string;
  actualizat_la: string;
}

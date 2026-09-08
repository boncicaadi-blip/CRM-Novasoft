export interface Angajat {
  id: string;
  nume: string;
  functie: string | null;
  departament: string | null;
  data_angajare: string | null;
  data_incetare: string | null;
  activ: boolean;
  user_id: string | null;
  manager_id: string | null;
  zile_alocate_an: number;
  created_at: string;
}

export type TipConcediu = "concediu_odihna" | "medical" | "eveniment_special";
export type StatusCerere = "in_asteptare" | "aprobat" | "respins";

export interface ConcediuCerere {
  id: string;
  angajat_id: string;
  tip: TipConcediu;
  data_inceput: string;
  data_sfarsit: string;
  nr_zile: number;
  status: StatusCerere;
  observatii: string | null;
  aprobat_de: string | null;
  data_aprobare: string | null;
  vazut_de_solicitant: boolean;
  created_at: string;
}

export interface ConcediuSold {
  id: string;
  angajat_id: string;
  an: number;
  zile_alocate: number;
}

export const TIP_CONCEDIU_LABELS: Record<TipConcediu, string> = {
  concediu_odihna: "Concediu de odihna",
  medical: "Concediu medical",
  eveniment_special: "Eveniment special",
};

export const TIP_CONCEDIU_COLORS: Record<TipConcediu, string> = {
  concediu_odihna: "#E8007A",
  medical: "#6366F1",
  eveniment_special: "#0070F3",
};

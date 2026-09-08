export interface ContractDraft {
  id: string;
  nume: string;
  tip_contract_id: string | null;
  produs_serviciu_id: string | null;
  storage_path: string;
  versiune: number;
  activ: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type StatusContractGenerat = "generat" | "validat" | "necesita_revizuire";

export interface ContractGenerat {
  id: string;
  opportunity_id: string | null;
  partner_id: string | null;
  draft_id: string | null;
  storage_path: string;
  status: StatusContractGenerat;
  note_validare: string | null;
  created_by: string | null;
  created_at: string;
}

export const STATUS_CONTRACT_LABELS: Record<StatusContractGenerat, string> = {
  generat: "Generat",
  validat: "Validat",
  necesita_revizuire: "Necesita revizuire",
};

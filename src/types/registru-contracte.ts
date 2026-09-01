export type TipPartenerRegistru = "client" | "furnizor";

export interface RegistruContract {
  id: string;
  nr_contract: number;
  tip_partener: TipPartenerRegistru;
  tip_document: string | null;
  data_contract: string | null;

  partner_id: string | null;
  partener_nume_liber: string | null;

  produs_serviciu_id: string | null;
  serviciu_id: string | null;
  detalii_serviciu: string | null;

  contact_nume: string | null;
  contact_email: string | null;
  contact_telefon: string | null;
  contact2_nume: string | null;
  contact2_email: string | null;
  contact2_telefon: string | null;

  status_draft: boolean;
  status_trimis: boolean;
  status_in_sistem: boolean;
  status_generat_grafic: boolean;
  status_semnat: boolean;
  status_primit: boolean;
  status_atasat: boolean;
  data_ultimului_status: string | null;

  contract_generat_id: string | null;
  created_by: string | null;
  created_at: string;
}

export const ETAPE_STATUS: { key: keyof RegistruContract; label: string }[] = [
  { key: "status_draft", label: "Draft" },
  { key: "status_trimis", label: "Trimis" },
  { key: "status_in_sistem", label: "În sistem" },
  { key: "status_generat_grafic", label: "Generat grafic" },
  { key: "status_semnat", label: "Semnat" },
  { key: "status_primit", label: "Primit" },
  { key: "status_atasat", label: "Atașat" },
];

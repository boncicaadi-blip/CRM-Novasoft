/** Datele minime de partener necesare pentru a completa placeholder-ele
 * standard dintr-un draft de contract. */
export interface PartnerPentruContract {
  nume: string;
  oras: string | null;
  adresa: string | null;
  reg_com: string | null;
  cod_fiscal: string | null;
  atribut_fiscal: string | null;
  reprezentant_nume: string | null;
  reprezentant_functie: string | null;
  forma_juridica: string | null;
}

function azi(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

/** Construieste harta de placeholder-e standard (client_nume, client_cui
 * etc.) dintr-un partener - folosita la completarea oricarui draft care
 * respecta aceasta convenite de denumire. */
export function mapeazaPartenerLaPlaceholdere(
  partner: PartnerPentruContract,
  extra?: { contract_nr?: string; contract_data?: string }
): Record<string, string> {
  return {
    client_nume: partner.nume ?? "",
    client_localitate: partner.oras ?? "",
    client_adresa: partner.adresa ?? "",
    client_reg_com: partner.reg_com ?? "",
    client_cui: partner.cod_fiscal ?? "",
    client_atribut_fiscal: partner.atribut_fiscal ?? "RO",
    client_reprezentant: partner.reprezentant_nume ?? "",
    client_reprezentant_functie: partner.reprezentant_functie ?? "",
    client_forma_juridica: partner.forma_juridica ?? "",
    contract_nr: extra?.contract_nr ?? "",
    contract_data: extra?.contract_data ?? azi(),
  };
}

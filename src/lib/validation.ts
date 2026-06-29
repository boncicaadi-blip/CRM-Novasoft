/**
 * Validari comerciale obligatorii, conform Faza 0 + Faza 1 din roadmap:
 *  - B-02: Status = Pierduta -> motiv_pierdere obligatoriu
 *  - B-03: Status = Amanata -> motiv_amanare + data_revenire obligatorii
 *  - B-04: Status = Activa -> actiune, data_actiune, responsabil_vanzare_id obligatorii
 *          (Stage = Ofertare/Negociere intareste aceeasi regula, fara exceptie)
 *
 * Functia primeste starea FINALA a oportunitatii (after merge cu modificarile
 * din formular) si returneaza lista de erori. Goala = valid.
 *
 * Important: validarea se aplica la fiecare salvare, inclusiv pe oportunitati
 * vechi care nu respectau regulile - asta e intentionat (vezi discutia cu
 * userul: validare stricta de la lansare, fara exceptie pentru date vechi).
 */

export interface ValidatableOpportunity {
  status: string;
  actiune: string | null;
  data_actiune: string | null;
  responsabil_vanzare_id: string | null;
  motiv_pierdere: string | null;
  motiv_amanare: string | null;
  data_revenire: string | null;
}

export function validateOpportunityBusinessRules(o: ValidatableOpportunity): string[] {
  const errors: string[] = [];

  if (o.status === "Activa") {
    if (!o.actiune) errors.push("Pentru status Activa, Actiunea este obligatorie.");
    if (!o.data_actiune) errors.push("Pentru status Activa, Data actiunii este obligatorie.");
    if (!o.responsabil_vanzare_id)
      errors.push("Pentru status Activa, Responsabilul de vanzare este obligatoriu.");
  }

  if (o.status === "Pierduta" && !o.motiv_pierdere) {
    errors.push("Pentru status Pierduta, Motivul pierderii este obligatoriu.");
  }

  if (o.status === "Amanata") {
    if (!o.motiv_amanare) errors.push("Pentru status Amanata, Motivul amanarii este obligatoriu.");
    if (!o.data_revenire) errors.push("Pentru status Amanata, Data de revenire este obligatorie.");
  }

  return errors;
}

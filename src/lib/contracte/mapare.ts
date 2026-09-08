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

/** Calculeaza cele 4 transe de plata (25% fiecare) dintr-o valoare totala
 * de contract - rotunjite la 2 zecimale, cu ajustare pe ultima transa ca
 * suma exacta sa corespunda cu totalul (evita erori de rotunjire). */
export function calculeazaTranseImplementare(valoareTotala: number): {
  transa_1: string;
  transa_2: string;
  transa_3: string;
  transa_4: string;
} {
  const transa = Math.round((valoareTotala * 0.25 + Number.EPSILON) * 100) / 100;
  const primele3 = transa * 3;
  const ultima = Math.round((valoareTotala - primele3 + Number.EPSILON) * 100) / 100;
  return {
    transa_1: transa.toFixed(2),
    transa_2: transa.toFixed(2),
    transa_3: transa.toFixed(2),
    transa_4: ultima.toFixed(2),
  };
}

/** Calculeaza totalurile pentru tabelul de abonament SaaS, din nr. de
 * utilizatori pe cele doua linii si valoarea unitara/utilizator. */
export function calculeazaTotaluriSaas(params: {
  nrUseri1: number;
  nrUseri2: number;
  valoarePerUser: number;
}): {
  saas_nr_useri_1: string;
  saas_nr_useri_2: string;
  saas_valoare_per_user: string;
  saas_total_rand1: string;
  saas_buget_total: string;
} {
  const totalUseri = params.nrUseri1 + params.nrUseri2;
  const totalRand1 = Math.round((params.nrUseri1 * params.valoarePerUser + Number.EPSILON) * 100) / 100;
  const bugetTotal = Math.round((totalUseri * params.valoarePerUser + Number.EPSILON) * 100) / 100;
  return {
    saas_nr_useri_1: String(params.nrUseri1),
    saas_nr_useri_2: String(params.nrUseri2),
    saas_valoare_per_user: params.valoarePerUser.toFixed(2),
    saas_total_rand1: totalRand1.toFixed(2),
    saas_buget_total: bugetTotal.toFixed(2),
  };
}

export interface Opportunity {
  id: string;
  opportunity_code: string | null;

  // Identificare firma
  nume_grup: string;
  nume_potential: string;
  cod_fiscal: string | null;
  responsabil_vanzare_id: string | null;
  domeniul_activitate: string | null;
  domeniul_activitate_id: string | null;
  judet: string | null;
  oras: string | null;
  cifra_afaceri: number | null;
  nr_angajati: number | null;
  cifra_afaceri_an: number | null;
  cifra_afaceri_actualizat_la: string | null;
  contact_nume: string | null;
  contact_functie: string | null;
  contact_telefon: string | null;
  contact_email: string | null;
  contact2_nume: string | null;
  contact2_functie: string | null;
  contact2_telefon: string | null;
  contact2_email: string | null;

  // Calificare tehnica
  solutia_existenta: string | null;
  client_novasoft: boolean;
  client_windsoft: boolean;
  produs_serviciu_propus: string | null;
  produs_serviciu_propus_id: string | null;
  contabilitate_interna: string | null;
  solutie_contabilitate: string | null;
  mai_multe_firme_grup: boolean;
  nr_societati_suplimentare: number | null;
  nume_societati_suplimentare: string | null;
  potential_fonduri_europene: boolean;
  furnizori_combustibil_1: string | null;
  furnizori_combustibil_2: string | null;
  furnizori_combustibil_3: string | null;
  furnizori_gps_1: string | null;
  furnizori_gps_2: string | null;
  interes_planificator: boolean;
  nr_vehicule: number | null;
  detalii_suplimentare_software: string | null;

  // Pipeline & status
  data_contactarii: string | null;
  stage: string;
  stage_id: string | null;
  status: string;
  status_id: string | null;
  substatus: string | null;
  motivatia_substatusului: string | null;
  probability: number;
  motiv_pierdere_id: string | null;
  motiv_pierdere: string | null;
  motiv_amanare_id: string | null;
  motiv_amanare: string | null;
  data_revenire: string | null;

  // Actiune curenta
  actiune: string | null;
  actiune_id: string | null;
  data_actiune: string | null;
  status_actiune: string | null;
  status_actiune_id: string | null;
  data_finalizare_actiune: string | null;
  observatii_actiune: string | null;

  // Tip proiect & pricing
  tip_proiect: string | null;
  tip_proiect_id: string | null;
  pricing_mode: "saas" | "onpremise";
  nr_utilizatori_synergo: number | null;
  valoare_saas_anuala: number;
  valoare_pachet_server_anual: number;
  valoare_firma_suplimentara: number;
  arr_synergo: number;
  mrr_synergo: number;
  valoare_pret_per_user: number;
  pachet_synergo_onpremise: number;
  licenta_companie_suplimentara: number;
  licenta_useri_suplimentari_onpremise: number;
  licenta_synergo_onpremise: number;
  valoare_mentenanta_per_user_onpremise: number;
  valoare_mentenanta_lunara_onpremise: number;
  valoare_implementare_synergo: number;

  // Forecast (generate de DB, read-only din UI)
  forecast_implementare: number;
  forecast_licente_onpremise: number;
  forecast_mentenanta_onpremise_lunar: number;
  forecast_saas_lunar: number;
  forecast_total_saas: number;
  forecast_total_onpremise: number;

  // Sursa & context
  canal_intrare: string | null;
  canal_intrare_id: string | null;
  nume_canal_intrare: string | null;
  oportunitati: string | null;
  feedback: string | null;
  observatii: string | null;

  // Meta
  created_at: string;
  updated_at: string;
  stage_changed_at: string;
  created_by: string | null;

  // Relatie populata separat (join)
  profiles?: { id: string; full_name: string } | null;
}

export type OpportunityInsert = Partial<
  Omit<
    Opportunity,
    | "id"
    | "opportunity_code"
    | "valoare_saas_anuala"
    | "arr_synergo"
    | "valoare_pret_per_user"
    | "licenta_synergo_onpremise"
    | "valoare_mentenanta_lunara_onpremise"
    | "forecast_implementare"
    | "forecast_licente_onpremise"
    | "forecast_mentenanta_onpremise_lunar"
    | "forecast_saas_lunar"
    | "forecast_total_saas"
    | "forecast_total_onpremise"
    | "created_at"
    | "updated_at"
    | "profiles"
  >
> & {
  nume_grup: string;
  nume_potential: string;
};

// Pentru update-uri partiale (ex: doar schimbarea stage-ului din Kanban),
// fara sa fie nevoie sa retrimitem nume_grup/nume_potential.
export type OpportunityUpdate = Partial<
  Omit<
    Opportunity,
    | "id"
    | "opportunity_code"
    | "valoare_saas_anuala"
    | "arr_synergo"
    | "valoare_pret_per_user"
    | "licenta_synergo_onpremise"
    | "valoare_mentenanta_lunara_onpremise"
    | "forecast_implementare"
    | "forecast_licente_onpremise"
    | "forecast_mentenanta_onpremise_lunar"
    | "forecast_saas_lunar"
    | "forecast_total_saas"
    | "forecast_total_onpremise"
    | "created_at"
    | "updated_at"
    | "profiles"
  >
>;

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "user";
  theme: "light" | "dark" | "system";
  approved: boolean;
  module_access: string[];
  created_at: string;
}

export interface OpportunityHistoryRow {
  id: string;
  opportunity_id: string;
  snapshot_date: string;
  stage: string | null;
  status: string | null;
  substatus: string | null;
  probability: number | null;
  arr_synergo: number | null;
  mrr_synergo: number | null;
  forecast_total_saas: number | null;
  forecast_total_onpremise: number | null;
}

export type NomenclatorCategorie =
  | "stage"
  | "status"
  | "domeniu_activitate"
  | "produs_serviciu"
  | "tip_proiect"
  | "canal_intrare"
  | "actiune"
  | "status_actiune"
  | "motiv_pierdere"
  | "motiv_amanare"
  | "venit_produs"
  | "venit_serviciu"
  | "tip_venit_contract"
  | "stadiu_contract"
  | "status_contract"
  | "modalitate_facturare";

export interface Nomenclator {
  id: string;
  categorie: NomenclatorCategorie;
  valoare: string;
  culoare: string | null;
  probability: number | null;
  ordine: number;
  activ: boolean;
  created_at: string;
}

export type TimelineEntryType =
  | "nota"
  | "call"
  | "email"
  | "demo"
  | "oferta_trimisa"
  | "follow_up"
  | "schimbare_stage"
  | "schimbare_status"
  | "actiune_finalizata"
  | "actiune_setata"
  | "creare"
  | "ai_rezumat"
  | "actiune_reprogramata";

export interface TimelineEntry {
  id: string;
  opportunity_id: string;
  tip: TimelineEntryType;
  continut: string | null;
  creat_de: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

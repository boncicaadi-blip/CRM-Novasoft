export interface Opportunity {
  id: string;
  opportunity_code: string | null;

  // Identificare firma
  nume_grup: string;
  nume_potential: string;
  cod_fiscal: string | null;
  responsabil_vanzare_id: string | null;
  domeniul_activitate: string | null;
  judet: string | null;
  oras: string | null;

  // Calificare tehnica
  solutia_existenta: string | null;
  client_novasoft: boolean;
  client_windsoft: boolean;
  produs_serviciu_propus: string | null;
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
  status: string;
  substatus: string | null;
  motivatia_substatusului: string | null;
  probability: number;

  // Actiune curenta
  actiune: string | null;
  data_actiune: string | null;
  status_actiune: string | null;
  data_finalizare_actiune: string | null;
  observatii_actiune: string | null;

  // Tip proiect & pricing
  tip_proiect: string | null;
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
  nume_canal_intrare: string | null;
  oportunitati: string | null;
  feedback: string | null;
  observatii: string | null;

  // Meta
  created_at: string;
  updated_at: string;
  created_by: string | null;

  // Relatie populata separat (join)
  profiles?: { id: string; full_name: string } | null;
}

export type OpportunityInsert = Partial<
  Omit<
    Opportunity,
    | "id"
    | "opportunity_code"
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

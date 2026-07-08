import { createClient } from "@/lib/supabase/server";

export interface PipelineSnapshot {
  pipelineActivSaas: number;
  pipelineActivOnprem: number;
  pipelineActivImplementare: number;
  pipelineTotalActiv: number;
  forecastTotalSaas: number;
  forecastTotalOnpremise: number;
  forecastTotal: number;
}

const EMPTY_SNAPSHOT: PipelineSnapshot = {
  pipelineActivSaas: 0,
  pipelineActivOnprem: 0,
  pipelineActivImplementare: 0,
  pipelineTotalActiv: 0,
  forecastTotalSaas: 0,
  forecastTotalOnpremise: 0,
  forecastTotal: 0,
};

/**
 * Reconstruieste valorile de pipeline/forecast la o data din trecut, din
 * istoricul salvat automat (opportunity_history.snapshot). Folosit pentru
 * calculul Pipeline Delta / Forecast Delta fata de o perioada anterioara.
 *
 * Returneaza null daca nu exista inca istoric suficient de vechi (de ex. in
 * prima saptamana dupa ce aceasta functionalitate a fost activata) - in acel
 * caz UI-ul trebuie sa afiseze explicit "date insuficiente", nu un delta gresit.
 */
export async function getPipelineSnapshotAt(targetDate: Date): Promise<PipelineSnapshot | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_pipeline_snapshot_at", { target_date: targetDate.toISOString() })
    .single();

  if (error || !data) {
    console.error("getPipelineSnapshotAt error:", error?.message);
    return null;
  }

  const row = data as {
    pipeline_activ_saas: number | null;
    pipeline_activ_onprem: number | null;
    pipeline_activ_implementare: number | null;
    forecast_total_saas: number | null;
    forecast_total_onpremise: number | null;
  };

  const pipelineActivSaas = row.pipeline_activ_saas ?? 0;
  const pipelineActivOnprem = row.pipeline_activ_onprem ?? 0;
  const pipelineActivImplementare = row.pipeline_activ_implementare ?? 0;
  const forecastTotalSaas = row.forecast_total_saas ?? 0;
  const forecastTotalOnpremise = row.forecast_total_onpremise ?? 0;

  // Daca totul e zero, aproape sigur inseamna ca nu exista niciun snapshot
  // de dinainte de target_date (istoric prea nou) - tratam ca "fara date",
  // ca sa nu afisam un delta de 100% fals la prima folosire.
  const hasData =
    pipelineActivSaas > 0 ||
    pipelineActivOnprem > 0 ||
    pipelineActivImplementare > 0 ||
    forecastTotalSaas > 0 ||
    forecastTotalOnpremise > 0;

  if (!hasData) return null;

  return {
    pipelineActivSaas,
    pipelineActivOnprem,
    pipelineActivImplementare,
    pipelineTotalActiv: pipelineActivSaas + pipelineActivOnprem + pipelineActivImplementare,
    forecastTotalSaas,
    forecastTotalOnpremise,
    forecastTotal: forecastTotalSaas + forecastTotalOnpremise,
  };
}

export { EMPTY_SNAPSHOT };

export interface RaportLunarRow {
  lunaStart: string; // ISO date (prima zi a lunii)
  pipelineTotalActiv: number;
  forecastTotal: number;
  castigatTotal: number;
  nrCastigate: number;
  nrPierdute: number;
  nrOportunitatiNoi: number;
  targetLunar: number | null;
}

/**
 * B-13: evolutia lunara (ultimele `monthsBack` luni calendaristice) pentru
 * raportul comercial lunar din Management. Reutilizeaza mecanismul deja
 * existent de reconstructie din istoric (get_pipeline_snapshot_at), nu
 * necesita niciun camp nou de completat manual.
 */
export async function getRaportLunar(monthsBack = 12): Promise<RaportLunarRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_raport_lunar", { months_back: monthsBack });

  if (error) {
    console.error("getRaportLunar error:", error.message);
    return [];
  }

  const rows = (data ?? []) as {
    luna_start: string;
    pipeline_total_activ: number | null;
    forecast_total: number | null;
    castigat_total: number | null;
    nr_castigate: number | null;
    nr_pierdute: number | null;
    nr_oportunitati_noi: number | null;
    target_lunar: number | null;
  }[];

  return rows.map((row) => ({
    lunaStart: row.luna_start,
    pipelineTotalActiv: row.pipeline_total_activ ?? 0,
    forecastTotal: row.forecast_total ?? 0,
    castigatTotal: row.castigat_total ?? 0,
    nrCastigate: row.nr_castigate ?? 0,
    nrPierdute: row.nr_pierdute ?? 0,
    nrOportunitatiNoi: row.nr_oportunitati_noi ?? 0,
    targetLunar: row.target_lunar,
  }));
}

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

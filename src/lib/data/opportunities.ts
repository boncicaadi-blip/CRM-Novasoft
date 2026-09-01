import { createClient } from "@/lib/supabase/server";
import { getTodayISO } from "@/lib/date";
import type { Opportunity, OpportunityInsert, OpportunityUpdate, Profile } from "@/types/opportunity";

export async function getOpportunities(): Promise<Opportunity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .select("*, profiles:responsabil_vanzare_id(id, full_name), partner:partner_id(judet, oras, website, contact_nume, contact_functie, solutia_existenta, nr_vehicule, nr_angajati, cifra_afaceri, potential_fonduri_europene, domeniu:domeniul_activitate_id(valoare))")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getOpportunities error:", error.message);
    return [];
  }
  return data as unknown as Opportunity[];
}

/**
 * Query usor, doar pentru oportunitatile relevante in popup-ul de rezumat
 * zilnic (B-05 zona "Azi"/"Intarziate") - selecteaza doar oportunitati cu
 * actiune planificata in trecut sau azi, ca sa nu tragem toate cele ~134
 * de oportunitati complete la fiecare randare de layout, doar pentru un
 * popup care oricum se afiseaza o singura data per sesiune.
 */
export async function getTodayAndOverdueOpportunities(): Promise<Opportunity[]> {
  const supabase = await createClient();
  const todayStr = getTodayISO();

  const { data, error } = await supabase
    .from("opportunities")
    .select("*, profiles:responsabil_vanzare_id(id, full_name)")
    .eq("status_actiune", "Planificata")
    .lte("data_actiune", todayStr)
    .order("data_actiune", { ascending: true });

  if (error) {
    console.error("getTodayAndOverdueOpportunities error:", error.message);
    return [];
  }
  return data as unknown as Opportunity[];
}

export async function getOpportunity(id: string): Promise<Opportunity | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .select("*, profiles:responsabil_vanzare_id(id, full_name), partner:partner_id(judet, oras, website, contact_nume, contact_functie, solutia_existenta, nr_vehicule, nr_angajati, cifra_afaceri, potential_fonduri_europene, domeniu:domeniul_activitate_id(valoare))")
    .eq("id", id)
    .single();

  if (error) {
    console.error("getOpportunity error:", error.message);
    return null;
  }
  return data as unknown as Opportunity;
}

export async function getProfiles(): Promise<Profile[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("*").order("full_name");
  if (error) {
    console.error("getProfiles error:", error.message);
    return [];
  }
  return data as Profile[];
}

export async function createOpportunity(payload: OpportunityInsert) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("opportunities")
    .insert({ ...payload, created_by: userData?.user?.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Opportunity;
}

export async function updateOpportunity(id: string, payload: OpportunityUpdate) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Opportunity;
}

export async function deleteOpportunity(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("opportunities").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getOpportunityHistory(opportunityId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunity_history")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .order("snapshot_date", { ascending: true });

  if (error) {
    console.error("getOpportunityHistory error:", error.message);
    return [];
  }
  return data;
}

async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const pageSize = 1000;
  let allRows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error) {
      console.error("fetchAllRows error:", error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

/**
 * Istoricul complet, pentru toate oportunitatile - folosit la reconstruirea
 * graficelor de evolutie (MRR, Implementare, miscare intre stage-uri) de pe
 * Dashboard Comercial. Inainte avea .limit(5000) cu sortare crescatoare,
 * ceea ce taia silentios exact datele cele mai RECENTE cand tabelul trecea
 * de 5000 de randuri (pastra doar cele mai vechi) - graficele "ramaneau in
 * urma", aratand aceeasi stare veche in loc de schimbarile din ultima
 * perioada. Acum pagineaza prin toate randurile, fara limita artificiala.
 */
export async function getAllHistory() {
  const rows = await fetchAllRows<{
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
    forecast_implementare: number | null;
  }>((from, to) =>
    createClient().then((supabase) =>
      supabase
        .from("opportunity_history")
        .select(
          "id, opportunity_id, snapshot_date, stage, status, substatus, probability, arr_synergo, mrr_synergo, forecast_total_saas, forecast_total_onpremise, forecast_implementare"
        )
        .order("snapshot_date", { ascending: true })
        .range(from, to)
    )
  );
  return rows;
}

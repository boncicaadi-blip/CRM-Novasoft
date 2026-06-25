import { createClient } from "@/lib/supabase/server";
import type { Opportunity, OpportunityInsert, OpportunityUpdate, Profile } from "@/types/opportunity";

export async function getOpportunities(): Promise<Opportunity[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .select("*, profiles:responsabil_vanzare_id(id, full_name)")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("getOpportunities error:", error.message);
    return [];
  }
  return data as unknown as Opportunity[];
}

export async function getOpportunity(id: string): Promise<Opportunity | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunities")
    .select("*, profiles:responsabil_vanzare_id(id, full_name)")
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

export async function getAllHistory() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunity_history")
    .select("id, opportunity_id, snapshot_date, stage, status, substatus, probability, arr_synergo, mrr_synergo, forecast_total_saas, forecast_total_onpremise")
    .order("snapshot_date", { ascending: true })
    .limit(5000);

  if (error) {
    console.error("getAllHistory error:", error.message);
    return [];
  }
  return data;
}

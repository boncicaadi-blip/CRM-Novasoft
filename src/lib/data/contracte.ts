import { createClient } from "@/lib/supabase/server";
import type { ContractDraft, ContractGenerat } from "@/types/contracte";

export async function getContractDrafturi(): Promise<ContractDraft[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contract_drafturi")
    .select("*")
    .order("nume", { ascending: true });
  if (error) {
    console.error("getContractDrafturi error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getContracteGenerate(opportunityId?: string): Promise<ContractGenerat[]> {
  const supabase = await createClient();
  let query = supabase.from("contracte_generate").select("*").order("created_at", { ascending: false });
  if (opportunityId) query = query.eq("opportunity_id", opportunityId);
  const { data, error } = await query;
  if (error) {
    console.error("getContracteGenerate error:", error.message);
    return [];
  }
  return data ?? [];
}

/** URL semnat, temporar, pentru a descarca un fisier din bucket-ul
 * "contracte" - bucket-ul e marcat "public" tehnic (pentru simplitate),
 * dar accesul real e controlat de RLS pe storage.objects, deci tot avem
 * nevoie de un URL semnat pentru cazurile unde vrem un link cu expirare. */
export async function getContractSignedUrl(storagePath: string, expiresInSeconds = 3600): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("contracte").createSignedUrl(storagePath, expiresInSeconds);
  if (error) {
    console.error("getContractSignedUrl error:", error.message);
    return null;
  }
  return data?.signedUrl ?? null;
}

/** Lista simpla de parteneri, pentru un picker (ex. la generarea unui
 * contract de test) - doar campurile relevante, nu tot ce are fisa. */
export async function getPartnersPentruContracte(): Promise<
  { id: string; nume: string; cod_fiscal: string | null }[]
> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partners")
    .select("id, nume, cod_fiscal")
    .order("nume", { ascending: true });
  if (error) {
    console.error("getPartnersPentruContracte error:", error.message);
    return [];
  }
  return data ?? [];
}

/** Toate contractele unui partener - atat cele generate automat (cu link
 * de descarcare), cat si intrarile din registru - pentru afisare pe fisa
 * partenerului. */
export async function getContractePartener(partnerId: string): Promise<{
  generate: { id: string; created_at: string; status: string; downloadUrl: string | null }[];
  registru: { id: string; nr_contract: number; tip_partener: string; data_contract: string | null; tip_document: string | null }[];
}> {
  const supabase = await createClient();

  const [{ data: generate }, { data: registru }] = await Promise.all([
    supabase
      .from("contracte_generate")
      .select("id, created_at, status, storage_path")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("registru_contracte")
      .select("id, nr_contract, tip_partener, data_contract, tip_document")
      .eq("partner_id", partnerId)
      .order("nr_contract", { ascending: false }),
  ]);

  const generateCuUrl = await Promise.all(
    (generate ?? []).map(async (g) => {
      const { data } = await supabase.storage.from("contracte").createSignedUrl(g.storage_path, 3600);
      return { id: g.id, created_at: g.created_at, status: g.status, downloadUrl: data?.signedUrl ?? null };
    })
  );

  return { generate: generateCuUrl, registru: registru ?? [] };
}

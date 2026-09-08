import { createClient } from "@/lib/supabase/server";
import type { RegistruContract, TipPartenerRegistru } from "@/types/registru-contracte";

export async function getRegistruContracte(): Promise<RegistruContract[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("registru_contracte")
    .select("*")
    .order("tip_partener", { ascending: true })
    .order("nr_contract", { ascending: false });
  if (error) {
    console.error("getRegistruContracte error:", error.message);
    return [];
  }
  return data ?? [];
}

/** Urmatorul numar disponibil pentru un tip de partener - simplu MAX+1;
 * clientii pornesc implicit de la 100, furnizorii de la 1000, daca nu
 * exista inca nimic. */
export async function getUrmatorulNumarContract(tipPartener: TipPartenerRegistru): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("registru_contracte")
    .select("nr_contract")
    .eq("tip_partener", tipPartener)
    .order("nr_contract", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.nr_contract) return data.nr_contract + 1;
  return tipPartener === "client" ? 100 : 1000;
}

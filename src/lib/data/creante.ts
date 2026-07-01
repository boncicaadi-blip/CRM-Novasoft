import { createClient } from "@/lib/supabase/server";
import type { Creanta, CreanteImportBatch } from "@/types/creante";

export async function getCreante(): Promise<Creanta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creante")
    .select("*")
    .order("data_scadenta", { ascending: true });

  if (error) {
    console.error("getCreante error:", error.message);
    return [];
  }
  return data as Creanta[];
}

export async function getLastImportBatch(): Promise<CreanteImportBatch | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creante_import_batches")
    .select("*")
    .order("importat_la", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getLastImportBatch error:", error.message);
    return null;
  }
  return data as CreanteImportBatch | null;
}

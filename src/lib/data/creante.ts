import { createClient } from "@/lib/supabase/server";
import type { Creanta, CreanteImportBatch, CreantaIncasare } from "@/types/creante";

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

/** Toate incasarile, grupate pe creanta_id, cele mai recente primele. */
export async function getCreanteIncasari(): Promise<Record<string, CreantaIncasare[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creante_incasari")
    .select("*")
    .order("data_incasare", { ascending: false });

  if (error) {
    console.error("getCreanteIncasari error:", error.message);
    return {};
  }

  const grouped: Record<string, CreantaIncasare[]> = {};
  for (const row of (data as CreantaIncasare[]) ?? []) {
    (grouped[row.creanta_id] ??= []).push(row);
  }
  return grouped;
}

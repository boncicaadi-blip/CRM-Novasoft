import { createClient } from "@/lib/supabase/server";
import type { Obligatie, ObligatiiImportBatch, ObligatiePlata } from "@/types/obligatii";

export async function getObligatii(): Promise<Obligatie[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("obligatii")
    .select("*")
    .order("data_scadenta", { ascending: true });

  if (error) {
    console.error("getObligatii error:", error.message);
    return [];
  }
  return data as Obligatie[];
}

export async function getObligatiiByFurnizor(nume: string): Promise<Obligatie[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("obligatii")
    .select("*")
    .eq("nume_furnizor", nume)
    .order("data_factura", { ascending: false });

  if (error) {
    console.error("getObligatiiByFurnizor error:", error.message);
    return [];
  }
  return data as Obligatie[];
}

export async function getLastObligatiiImportBatch(): Promise<ObligatiiImportBatch | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("obligatii_import_batches")
    .select("*")
    .order("importat_la", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getLastObligatiiImportBatch error:", error.message);
    return null;
  }
  return data as ObligatiiImportBatch | null;
}

/** Toate platile, grupate pe obligatie_id, cele mai recente primele. */
export async function getObligatiiPlati(): Promise<Record<string, ObligatiePlata[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("obligatii_plati")
    .select("*")
    .order("data_plata", { ascending: false });

  if (error) {
    console.error("getObligatiiPlati error:", error.message);
    return {};
  }

  const grouped: Record<string, ObligatiePlata[]> = {};
  for (const row of (data as ObligatiePlata[]) ?? []) {
    (grouped[row.obligatie_id] ??= []).push(row);
  }
  return grouped;
}

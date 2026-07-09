import { createClient } from "@/lib/supabase/server";
import type { Nomenclator, NomenclatorCategorie } from "@/types/opportunity";

/** Toate nomenclatoarele active, grupate pe categorie, ordonate. */
export async function getNomenclatoare(): Promise<Record<string, Nomenclator[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nomenclatoare")
    .select("*")
    .eq("activ", true)
    .order("categorie")
    .order("ordine");

  if (error) {
    console.error("getNomenclatoare error:", error.message);
    return {};
  }

  const grouped: Record<string, Nomenclator[]> = {};
  for (const row of data as Nomenclator[]) {
    if (!grouped[row.categorie]) grouped[row.categorie] = [];
    grouped[row.categorie].push(row);
  }
  return grouped;
}

/** Toate nomenclatoarele (inclusiv inactive) - pentru pagina de administrare. */
export async function getAllNomenclatoare(): Promise<Nomenclator[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nomenclatoare")
    .select("*")
    .order("categorie")
    .order("ordine");

  if (error) {
    console.error("getAllNomenclatoare error:", error.message);
    return [];
  }
  return data as Nomenclator[];
}

export async function createNomenclator(payload: {
  categorie: NomenclatorCategorie;
  valoare: string;
  culoare?: string | null;
  probability?: number | null;
  parent_id?: string | null;
  ordine?: number;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from("nomenclatoare")
    .insert({ ...payload, created_by: userData?.user?.id })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Nomenclator;
}

export async function updateNomenclator(
  id: string,
  payload: Partial<Pick<Nomenclator, "valoare" | "culoare" | "probability" | "parent_id" | "ordine" | "activ">>
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("nomenclatoare")
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Nomenclator;
}

export async function deleteNomenclator(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("nomenclatoare").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Harta valoare -> culoare pentru Stage si Status, citita din nomenclatoare.
 * Foloseste fallback-urile din constants.ts pentru valori care nu au inca o
 * culoare setata in DB (ex. imediat dupa o migrare).
 */
export async function getColorMaps() {
  const grouped = await getNomenclatoare();
  const stageColors: Record<string, string> = {};
  const statusColors: Record<string, string> = {};

  for (const item of grouped["stage"] ?? []) {
    if (item.culoare) stageColors[item.valoare] = item.culoare;
  }
  for (const item of grouped["status"] ?? []) {
    if (item.culoare) statusColors[item.valoare] = item.culoare;
  }

  return { stageColors, statusColors };
}

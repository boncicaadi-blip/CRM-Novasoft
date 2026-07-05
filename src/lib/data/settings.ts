import { createClient } from "@/lib/supabase/server";

export interface CompanySettings {
  targetComercial: number | null;
}

/** Targetul comercial curent (anul acesta) - citit din target_comercial_anual,
 * cu fallback la vechiul camp global daca nu exista inca un rand pentru anul
 * curent (compatibilitate cu ce era setat inainte de trecerea pe targete
 * anuale). */
export async function getCompanySettings(): Promise<CompanySettings> {
  const supabase = await createClient();
  const anCurent = new Date().getFullYear();

  const { data: anual } = await supabase
    .from("target_comercial_anual")
    .select("target")
    .eq("an", anCurent)
    .maybeSingle();

  if (anual) return { targetComercial: Number(anual.target) };

  const { data, error } = await supabase
    .from("company_settings")
    .select("target_comercial")
    .eq("id", 1)
    .single();

  if (error || !data) {
    console.error("getCompanySettings error:", error?.message);
    return { targetComercial: null };
  }

  return { targetComercial: data.target_comercial };
}

export interface TargetAnual {
  an: number;
  target: number;
}

/** Toate targetele setate, pe ani - pentru pagina de Setari -> Comercial,
 * unde se pot vedea/edita si anii anteriori (din istoricul importat). */
export async function getTargeteComercialeAnuale(): Promise<TargetAnual[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("target_comercial_anual")
    .select("an, target")
    .order("an", { ascending: false });

  if (error) {
    console.error("getTargeteComercialeAnuale error:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({ an: r.an, target: Number(r.target) }));
}

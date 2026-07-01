import { createClient } from "@/lib/supabase/server";

export interface CompanySettings {
  targetComercial: number | null;
}

export async function getCompanySettings(): Promise<CompanySettings> {
  const supabase = await createClient();
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

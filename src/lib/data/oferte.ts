import { createClient } from "@/lib/supabase/server";
import type { OpportunityOferta } from "@/types/opportunity";

/** Ofertele PDF atasate unei oportunitati, cele mai noi (versiunea cea mai mare) primele. */
export async function getOferteOportunitate(opportunityId: string): Promise<OpportunityOferta[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunity_oferte")
    .select("*, profiles:creat_de(full_name)")
    .eq("opportunity_id", opportunityId)
    .order("versiune", { ascending: false });

  if (error) {
    console.error("getOferteOportunitate error:", error.message);
    return [];
  }
  return data as OpportunityOferta[];
}

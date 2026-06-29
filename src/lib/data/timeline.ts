import { createClient } from "@/lib/supabase/server";
import type { TimelineEntry } from "@/types/opportunity";

export async function getTimeline(opportunityId: string): Promise<TimelineEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("opportunity_timeline")
    .select("*, profiles:creat_de(full_name)")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getTimeline error:", error.message);
    return [];
  }
  return data as TimelineEntry[];
}

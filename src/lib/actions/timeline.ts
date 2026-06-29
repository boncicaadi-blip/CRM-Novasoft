"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TimelineEntryType } from "@/types/opportunity";

const MANUAL_TYPES: TimelineEntryType[] = [
  "nota",
  "call",
  "email",
  "demo",
  "oferta_trimisa",
  "follow_up",
];

export async function addTimelineEntryAction(
  opportunityId: string,
  tip: TimelineEntryType,
  continut: string
): Promise<{ success: boolean; message?: string }> {
  if (!MANUAL_TYPES.includes(tip)) {
    return { success: false, message: "Tip de intrare invalid." };
  }
  if (!continut.trim()) {
    return { success: false, message: "Continutul este obligatoriu." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase.from("opportunity_timeline").insert({
    opportunity_id: opportunityId,
    tip,
    continut: continut.trim(),
    creat_de: userData?.user?.id ?? null,
  });

  if (error) return { success: false, message: error.message };

  revalidatePath(`/oportunitati/${opportunityId}`);
  return { success: true };
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { askClaude, AiConfigError, AiRequestError } from "@/lib/ai/client";
import {
  buildOpportunitySummarySystemPrompt,
  buildOpportunitySummaryPrompt,
  parseOpportunitySummaryResponse,
  type OpportunitySummaryResult,
} from "@/lib/ai/prompts";
import type { Opportunity, TimelineEntry } from "@/types/opportunity";

export async function generateOpportunitySummaryAction(
  opportunityId: string
): Promise<{ success: boolean; message?: string; data?: OpportunitySummaryResult }> {
  const supabase = await createClient();

  const [{ data: opportunity, error: oppError }, { data: timelineRaw, error: timelineError }] =
    await Promise.all([
      supabase.from("opportunities").select("*").eq("id", opportunityId).single(),
      supabase
        .from("opportunity_timeline")
        .select("*, profiles:creat_de(full_name)")
        .eq("opportunity_id", opportunityId)
        .order("created_at", { ascending: false }),
    ]);

  if (oppError || !opportunity) {
    return { success: false, message: "Oportunitatea nu a putut fi incarcata." };
  }
  if (timelineError) {
    return { success: false, message: "Istoricul oportunitatii nu a putut fi incarcat." };
  }

  const timeline = (timelineRaw ?? []) as TimelineEntry[];

  try {
    const raw = await askClaude({
      system: buildOpportunitySummarySystemPrompt(),
      prompt: buildOpportunitySummaryPrompt(opportunity as Opportunity, timeline),
      maxTokens: 800,
    });

    const parsed = parseOpportunitySummaryResponse(raw);
    return { success: true, data: parsed };
  } catch (err) {
    if (err instanceof AiConfigError) {
      return { success: false, message: err.message };
    }
    if (err instanceof AiRequestError) {
      return { success: false, message: err.message };
    }
    console.error("generateOpportunitySummaryAction error:", err);
    return {
      success: false,
      message: "Nu am putut genera rezumatul AI. Incearca din nou in cateva momente.",
    };
  }
}

import { createClient } from "@/lib/supabase/server";
import { DEFAULT_AI_MODEL, type ClaudeUsage } from "@/lib/ai/client";

/**
 * Inregistreaza un apel catre Claude in jurnalul de consum AI - indiferent
 * daca a reusit sau nu (esecul tot a costat tokeni). Esecurile la scrierea
 * jurnalului nu blocheaza fluxul principal.
 */
export async function logAiUsage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  feature: string,
  usage: ClaudeUsage & { success: boolean },
  model: string = DEFAULT_AI_MODEL
): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("ai_usage_log").insert({
      feature,
      model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      thinking_tokens: usage.thinkingTokens,
      success: usage.success,
      user_id: userData?.user?.id ?? null,
    });
  } catch (err) {
    console.error("Nu am putut scrie in jurnalul de consum AI:", err);
  }
}

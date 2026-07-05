// Client minimal pentru API-ul Anthropic (Claude), fara SDK extern.
// Cheia se citeste din variabila de mediu ANTHROPIC_API_KEY (setata in Vercel,
// niciodata in cod sau in .env.local versionat).

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

// Model implicit pentru task-uri de rezumat/analiza comerciala.
// Se poate schimba central de aici daca Anthropic lanseaza un model nou.
export const DEFAULT_AI_MODEL = "claude-sonnet-5";

export class AiConfigError extends Error {}
export class AiRequestError extends Error {}

export interface ClaudeUsage {
  inputTokens: number;
  outputTokens: number;
  thinkingTokens: number;
}

interface ClaudeMessageResponse {
  content: { type: string; text?: string }[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    output_tokens_details?: { thinking_tokens?: number };
  };
}

/**
 * Trimite un prompt simplu (un singur mesaj user + system prompt) catre Claude
 * si returneaza textul de raspuns concatenat.
 *
 * onUsage, daca e dat, se apeleaza mereu dupa ce primim un raspuns de la API
 * (chiar daca textul iese gol si aruncam eroare) - un apel esuat tot
 * consuma tokeni si costa bani, deci trebuie contorizat la fel ca unul
 * reusit. Nu face nimic legat de baza de date aici - doar raporteaza
 * cifrele, apelantul decide ce face cu ele (vezi lib/ai/usage-log.ts).
 */
export async function askClaude(params: {
  system: string;
  prompt: string;
  model?: string;
  maxTokens?: number;
  onUsage?: (usage: ClaudeUsage & { success: boolean }) => void | Promise<void>;
}): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new AiConfigError(
      "ANTHROPIC_API_KEY nu este configurata. Adauga-o in variabilele de mediu (Vercel -> Settings -> Environment Variables)."
    );
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: params.model ?? DEFAULT_AI_MODEL,
      max_tokens: params.maxTokens ?? 3000,
      system: params.system,
      messages: [{ role: "user", content: params.prompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error(`Anthropic API error (${response.status}):`, errorBody);
    // Nu avem usage aici - un raspuns non-200 de obicei nu a consumat
    // tokeni de output (a picat inainte de generare), doar eventual input.
    throw new AiRequestError(
      `Eroare API Claude (${response.status}): ${errorBody || response.statusText}`
    );
  }

  const data = (await response.json()) as ClaudeMessageResponse;
  const text = data.content
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n")
    .trim();

  const success = text.length > 0;
  if (params.onUsage) {
    await params.onUsage({
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
      thinkingTokens: data.usage?.output_tokens_details?.thinking_tokens ?? 0,
      success,
    });
  }

  if (!success) {
    // Logam raspunsul complet - fara asta, nu avem cum sa stim DE CE a iesit
    // gol (stop_reason diferit, tip de content neasteptat, etc).
    console.error("Raspuns gol de la Claude. Content brut:", JSON.stringify(data));
    throw new AiRequestError("Raspuns gol de la Claude. Vezi logurile serverului pentru detalii.");
  }

  return text;
}

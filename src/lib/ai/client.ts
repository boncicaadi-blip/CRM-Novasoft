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

interface ClaudeMessageResponse {
  content: { type: string; text?: string }[];
}

/**
 * Trimite un prompt simplu (un singur mesaj user + system prompt) catre Claude
 * si returneaza textul de raspuns concatenat.
 */
export async function askClaude(params: {
  system: string;
  prompt: string;
  model?: string;
  maxTokens?: number;
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
      max_tokens: params.maxTokens ?? 1200,
      system: params.system,
      messages: [{ role: "user", content: params.prompt }],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
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

  if (!text) {
    throw new AiRequestError("Raspuns gol de la Claude.");
  }

  return text;
}

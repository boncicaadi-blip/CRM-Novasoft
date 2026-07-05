// Preturi Anthropic per model, in USD per milion de tokeni. Tinem cont de
// tranzitia cunoscuta pret introductiv -> standard, ca sa calculam corect
// costul istoric (un apel din iulie 2026 a costat cat costa atunci, nu cat
// costa acum, daca preturile s-au schimbat intre timp).

interface PriceTier {
  from: Date;
  input: number;
  output: number;
}

const SONNET_5_PRICING: PriceTier[] = [
  { from: new Date("2026-06-30T00:00:00Z"), input: 2, output: 10 },
  { from: new Date("2026-09-01T00:00:00Z"), input: 3, output: 15 },
];

const PRICING_BY_MODEL: Record<string, PriceTier[]> = {
  "claude-sonnet-5": SONNET_5_PRICING,
};

const FALLBACK_PRICING: PriceTier = { from: new Date(0), input: 3, output: 15 };

/** Cost estimat in USD pentru un apel, in functie de model si data la care a avut loc. */
export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number,
  when: Date
): number {
  const tiers = PRICING_BY_MODEL[model];
  let tier: PriceTier = FALLBACK_PRICING;

  if (tiers) {
    for (const t of tiers) {
      if (when >= t.from) tier = t;
    }
  }

  return (inputTokens * tier.input) / 1_000_000 + (outputTokens * tier.output) / 1_000_000;
}

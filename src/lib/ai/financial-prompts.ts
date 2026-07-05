export interface FinancialInsightResult {
  rezumat: string;
  riscuri: string;
  recomandari: string;
}

const REGULI_COMUNE = `
Reguli stricte:
- Nu inventa cifre sau fapte care nu apar in datele primite. Daca o informatie lipseste, spune explicit ca lipseste.
- Fii concret - mentioneaza cifre, nume de clienti, procente reale din datele primite, nu formulari generice.
- Scrie in limba romana, ton profesional, direct, fara fraze de umplutura.
- Raspunde STRICT in format JSON valid, fara text inainte sau dupa, fara backticks markdown. Structura exacta:

{
  "rezumat": "3-5 propozitii despre starea generala, pe baza cifrelor primite",
  "riscuri": "2-4 propozitii despre cele mai importante riscuri/anomalii vizibile in date, sau 'Niciun risc semnificativ vizibil' daca nu exista",
  "recomandari": "2-3 actiuni concrete, prioritizate, pe care le poate face administratorul"
}`;

export function buildCreanteInsightSystemPrompt(): string {
  return `Esti un asistent financiar intern pentru Novasoft Technologies SRL (solutii software TMS/ERP pentru firme de transport si logistica din Romania). Primesti un sumar al situatiei de Creante (bani de incasat de la clienti) si trebuie sa produci o interpretare utila pentru administrator.
${REGULI_COMUNE}`;
}

export function buildCreanteInsightPrompt(sumar: string): string {
  return `Sumarul situatiei de Creante, la data curenta:\n\n${sumar}`;
}

export function buildVenituriInsightSystemPrompt(): string {
  return `Esti un asistent financiar intern pentru Novasoft Technologies SRL (solutii software TMS/ERP pentru firme de transport si logistica din Romania). Primesti un sumar al situatiei de Venituri (buget estimat vs. realizat, din contracte si vanzari) si trebuie sa produci o interpretare utila pentru administrator.
${REGULI_COMUNE}`;
}

export function buildVenituriInsightPrompt(sumar: string): string {
  return `Sumarul situatiei de Venituri, la data curenta:\n\n${sumar}`;
}

export function parseFinancialInsightResponse(raw: string): FinancialInsightResult {
  const cleaned = raw.replace(/^```json\s*|```$/g, "").trim();
  const parsed = JSON.parse(cleaned);

  if (
    typeof parsed.rezumat !== "string" ||
    typeof parsed.riscuri !== "string" ||
    typeof parsed.recomandari !== "string"
  ) {
    throw new Error("Raspunsul AI nu are structura asteptata.");
  }

  return { rezumat: parsed.rezumat, riscuri: parsed.riscuri, recomandari: parsed.recomandari };
}

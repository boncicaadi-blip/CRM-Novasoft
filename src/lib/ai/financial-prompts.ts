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

export function buildObligatiiInsightSystemPrompt(): string {
  return `Esti un asistent financiar intern pentru Novasoft Technologies SRL (solutii software TMS/ERP pentru firme de transport si logistica din Romania). Primesti un sumar al situatiei de Obligatii (bani de platit catre furnizori) si trebuie sa produci o interpretare utila pentru administrator.
${REGULI_COMUNE}`;
}

export function buildObligatiiInsightPrompt(sumar: string): string {
  return `Sumarul situatiei de Obligatii, la data curenta:\n\n${sumar}`;
}

export function buildCheltuieliInsightSystemPrompt(): string {
  return `Esti un asistent financiar intern pentru Novasoft Technologies SRL (solutii software TMS/ERP pentru firme de transport si logistica din Romania). Primesti un sumar al situatiei de Cheltuieli (costuri operationale, prognozat vs. realizat) si trebuie sa produci o interpretare utila pentru administrator.
${REGULI_COMUNE}`;
}

export function buildCheltuieliInsightPrompt(sumar: string): string {
  return `Sumarul situatiei de Cheltuieli, la data curenta:\n\n${sumar}`;
}

export function buildManagementInsightSystemPrompt(): string {
  return `Esti un asistent financiar intern pentru Novasoft Technologies SRL (solutii software TMS/ERP pentru firme de transport si logistica din Romania). Primesti un sumar combinat de Venituri, Cheltuieli, Profit si productivitate (P&L simplificat) si trebuie sa produci o interpretare utila pentru administrator, la nivel de business, nu doar per modul.
${REGULI_COMUNE}`;
}

export function buildManagementInsightPrompt(sumar: string): string {
  return `Sumarul de Management (P&L simplificat), la data curenta:\n\n${sumar}`;
}

export function buildPlInsightSystemPrompt(): string {
  return `Esti un asistent financiar intern pentru Novasoft Technologies SRL (solutii software TMS/ERP pentru firme de transport si logistica din Romania). Primesti un sumar detaliat P&L (Venituri pe tip, Costuri pe grupe de Incadrare/Clasa, Estimat vs. Realizat) si trebuie sa produci o interpretare utila pentru administrator - unde se duc banii, ce grupe de cost se abat cel mai mult de la estimat, si ce ar merita investigat.
${REGULI_COMUNE}`;
}

export function buildPlInsightPrompt(sumar: string): string {
  return `Sumarul P&L detaliat, la data curenta:\n\n${sumar}`;
}

export function buildVenituriInsightSystemPrompt(): string {
  return `Esti un asistent financiar intern pentru Novasoft Technologies SRL (solutii software TMS/ERP pentru firme de transport si logistica din Romania). Primesti un sumar al situatiei de Venituri (buget estimat vs. realizat, din contracte si vanzari) si trebuie sa produci o interpretare utila pentru administrator.
${REGULI_COMUNE}`;
}

export function buildVenituriInsightPrompt(sumar: string): string {
  return `Sumarul situatiei de Venituri, la data curenta:\n\n${sumar}`;
}

export function buildCrmInsightSystemPrompt(): string {
  return `Esti un asistent comercial intern pentru Novasoft Technologies SRL (solutii software TMS/ERP pentru firme de transport si logistica din Romania). Primesti un sumar al pipeline-ului CRM (oportunitati, forecast, risc de stagnare) si trebuie sa produci o interpretare utila pentru administrator.
${REGULI_COMUNE}`;
}

export function buildCrmInsightPrompt(sumar: string): string {
  return `Sumarul pipeline-ului CRM, la data curenta:\n\n${sumar}`;
}

export function parseFinancialInsightResponse(raw: string): FinancialInsightResult {
  let cleaned = raw.replace(/^```json\s*|```\s*$/g, "").trim();

  // Daca modelul a adaugat orice text inainte/dupa obiectul JSON (desi i s-a
  // cerut sa nu o faca), extragem doar portiunea intre prima { si ultima }.
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    console.error("Nu am putut parsa raspunsul AI ca JSON. Raspuns brut:", raw);
    throw err;
  }

  const obj = parsed as Record<string, unknown>;
  if (
    typeof obj.rezumat !== "string" ||
    typeof obj.riscuri !== "string" ||
    typeof obj.recomandari !== "string"
  ) {
    console.error("Raspunsul AI nu are structura asteptata. Raspuns brut:", raw);
    throw new Error("Raspunsul AI nu are structura asteptata.");
  }

  return { rezumat: obj.rezumat, riscuri: obj.riscuri, recomandari: obj.recomandari };
}

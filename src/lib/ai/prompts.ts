import type { Opportunity, TimelineEntry } from "@/types/opportunity";

const TIMELINE_LABELS: Record<string, string> = {
  nota: "Nota",
  call: "Apel telefonic",
  email: "Email",
  demo: "Demo",
  oferta_trimisa: "Oferta trimisa",
  follow_up: "Follow-up",
  schimbare_stage: "Schimbare stage",
  schimbare_status: "Schimbare status",
  actiune_finalizata: "Actiune finalizata",
  actiune_setata: "Actiune programata",
  creare: "Intrare in sistem",
};

function formatTimelineForPrompt(entries: TimelineEntry[]): string {
  if (entries.length === 0) return "(niciun eveniment inregistrat inca)";

  // Cele mai recente 20 de evenimente, in ordine cronologica (vechi -> nou),
  // ca modelul sa inteleaga evolutia, nu doar starea curenta.
  const recent = [...entries].slice(0, 20).reverse();

  return recent
    .map((e) => {
      const data = new Date(e.created_at).toLocaleDateString("ro-RO");
      const tip = TIMELINE_LABELS[e.tip] ?? e.tip;
      const continut = e.continut ? ` - ${e.continut}` : "";
      return `[${data}] ${tip}${continut}`;
    })
    .join("\n");
}

function zileDeLa(dataIso: string | null): string {
  if (!dataIso) return "necunoscut";
  const zile = Math.floor((Date.now() - new Date(dataIso).getTime()) / 86_400_000);
  if (zile < 0) return "in viitor";
  if (zile === 0) return "astazi";
  return `${zile} zile`;
}

export function buildOpportunitySummarySystemPrompt(): string {
  return `Esti un asistent comercial intern pentru echipa de vanzari Novasoft Technologies (solutii software TMS/ERP pentru firme de transport si logistica din Romania).

Primesti datele unei oportunitati din CRM (stage, status, valori, istoric de interactiuni) si trebuie sa produci:
1. Un rezumat scurt si concret al situatiei (context, ce s-a intamplat, unde exista blocaje).
2. O recomandare de "next best action" - urmatorul pas concret, cu o motivatie scurta bazata pe date reale din istoric.

Reguli stricte:
- Nu inventa fapte care nu apar in datele primite. Daca informatia lipseste, spune explicit ca lipseste, nu presupune.
- Fii concret si specific (mentioneaza zile, sume, evenimente concrete), nu generic.
- Scrie in limba romana, ton profesional, direct, fara fraze de umplutura.
- Raspunde STRICT in format JSON valid, fara text inainte sau dupa, fara backticks markdown. Structura exacta:

{
  "rezumat": "text de 3-5 propozitii",
  "blocaje": "text scurt despre blocaje/riscuri, sau 'Niciun blocaj vizibil' daca nu exista",
  "next_best_action": "pasul concret recomandat, o propozitie",
  "motivatie": "de ce acest pas, bazat pe datele din istoric, o propozitie"
}`;
}

export function buildOpportunitySummaryPrompt(
  o: Opportunity,
  timeline: TimelineEntry[]
): string {
  const valoare =
    o.pricing_mode === "saas"
      ? `Forecast SaaS: ${o.forecast_total_saas} EUR`
      : `Forecast OnPremise: ${o.forecast_total_onpremise} EUR`;

  return `DATE OPORTUNITATE

Firma: ${o.nume_potential} (${o.nume_grup})
Stage curent: ${o.stage} (in acest stage de la: ${zileDeLa(o.stage_changed_at)})
Status: ${o.status}${o.substatus ? ` / ${o.substatus}` : ""}
Probabilitate: ${Math.round((o.probability ?? 0) * 100)}%
${valoare}
Forecast implementare: ${o.forecast_implementare} EUR

Actiune curenta setata: ${o.actiune ?? "(nicio actiune setata)"}${
    o.data_actiune ? ` - programata pentru ${new Date(o.data_actiune).toLocaleDateString("ro-RO")}` : ""
  }
Status actiune: ${o.status_actiune ?? "-"}

${o.motiv_pierdere ? `Motiv pierdere: ${o.motiv_pierdere}` : ""}
${o.motiv_amanare ? `Motiv amanare: ${o.motiv_amanare} (revenire: ${o.data_revenire ? new Date(o.data_revenire).toLocaleDateString("ro-RO") : "necunoscut"})` : ""}

Ultima actualizare a oportunitatii: acum ${zileDeLa(o.updated_at)}

ISTORIC (cronologic, cele mai recente ${Math.min(timeline.length, 20)} evenimente din ${timeline.length} total):
${formatTimelineForPrompt(timeline)}

Genereaza rezumatul si recomandarea conform instructiunilor din system prompt.`;
}

export interface OpportunitySummaryResult {
  rezumat: string;
  blocaje: string;
  next_best_action: string;
  motivatie: string;
}

export function parseOpportunitySummaryResponse(raw: string): OpportunitySummaryResult {
  // Claude poate uneori sa incadreze raspunsul in ```json ... ``` desi i s-a cerut sa nu o faca;
  // curatam defensiv inainte de parsare.
  const cleaned = raw.replace(/^```json\s*|```$/g, "").trim();
  const parsed = JSON.parse(cleaned);

  if (
    typeof parsed.rezumat !== "string" ||
    typeof parsed.next_best_action !== "string" ||
    typeof parsed.motivatie !== "string"
  ) {
    throw new Error("Raspunsul AI nu are structura asteptata.");
  }

  return {
    rezumat: parsed.rezumat,
    blocaje: typeof parsed.blocaje === "string" ? parsed.blocaje : "",
    next_best_action: parsed.next_best_action,
    motivatie: parsed.motivatie,
  };
}

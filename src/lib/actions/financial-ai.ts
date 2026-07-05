"use server";

import { createClient } from "@/lib/supabase/server";
import { askClaude, AiConfigError, AiRequestError } from "@/lib/ai/client";
import { logAiUsage } from "@/lib/ai/usage-log";
import {
  buildCreanteInsightSystemPrompt,
  buildCreanteInsightPrompt,
  buildVenituriInsightSystemPrompt,
  buildVenituriInsightPrompt,
  buildCrmInsightSystemPrompt,
  buildCrmInsightPrompt,
  parseFinancialInsightResponse,
  type FinancialInsightResult,
} from "@/lib/ai/financial-prompts";
import { getCreante, getCreanteIncasari, getCreanteTargetsLunare } from "@/lib/data/creante";
import { computeCreanteSummary } from "@/lib/creante-analytics";
import { groupByAgingCreante, topRiscCreante, buildGrtSeries } from "@/lib/creante-dashboard-analytics";
import { formatEur, formatRon } from "@/lib/format";
import { getVenituriLinii, getContracte } from "@/lib/data/venituri";
import {
  groupByProdus,
  groupByServiciu,
  topClienti,
  buildEvolutieLunara,
} from "@/lib/venituri-dashboard-analytics";
import { getOpportunities } from "@/lib/data/opportunities";
import { computeKpis, computePipelineReportKpis, groupByStage, groupByStatus, buildRiskLists } from "@/lib/analytics";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { supabase, isAdmin: false };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  return { supabase, isAdmin: profile?.role === "admin" };
}

/** Salveaza o interpretare reusita in istoric - nu blocam raspunsul catre
 * utilizator daca scrierea in istoric esueaza. */
async function saveInsightToHistory(
  supabase: Awaited<ReturnType<typeof createClient>>,
  feature: string,
  result: FinancialInsightResult
): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("ai_insights_history").insert({
      feature,
      rezumat: result.rezumat,
      riscuri: result.riscuri,
      recomandari: result.recomandari,
      creat_de: userData?.user?.id ?? null,
    });
  } catch (err) {
    console.error("Nu am putut salva interpretarea in istoric:", err);
  }
}

export interface AiInsightHistoryRow {
  id: string;
  rezumat: string;
  riscuri: string;
  recomandari: string;
  creat_la: string;
}

/** Ultimele interpretari salvate pentru un anumit feature (dashboard). */
export async function getAiInsightHistoryAction(
  feature: string,
  limit = 10
): Promise<{ success: boolean; message?: string; data?: AiInsightHistoryRow[] }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot vedea istoricul." };

  const { data, error } = await supabase
    .from("ai_insights_history")
    .select("id, rezumat, riscuri, recomandari, creat_la")
    .eq("feature", feature)
    .order("creat_la", { ascending: false })
    .limit(limit);

  if (error) return { success: false, message: error.message };
  return { success: true, data: data ?? [] };
}

function handleAiError(err: unknown): { success: false; message: string } {
  if (err instanceof AiConfigError) return { success: false, message: err.message };
  if (err instanceof AiRequestError) return { success: false, message: err.message };
  console.error("AI insight error:", err);
  return { success: false, message: "Nu am putut genera interpretarea AI. Incearca din nou in cateva momente." };
}

async function buildCreanteSummaryText(): Promise<string> {
  const [creante, incasari, targets] = await Promise.all([
    getCreante(),
    getCreanteIncasari(),
    getCreanteTargetsLunare(),
  ]);

  const summary = computeCreanteSummary(creante);
  const aging = groupByAgingCreante(creante);
  const risc = topRiscCreante(creante, 5);
  const incasariFlat = Object.values(incasari).flat();
  const grt = buildGrtSeries(incasariFlat, targets, 5);

  const lines = [
    `Sold total restant: ${formatRon(summary.totalSoldRestant)} (${summary.nrFacturiRestante} facturi)`,
    `Target propus luna curenta: ${formatRon(summary.targetPropus)} (${summary.nrFacturiPropuse} facturi)`,
    ``,
    `Vechime sold restant (aging):`,
    ...aging.map((a) => `- ${a.label}: ${formatRon(a.sold)} (${a.count} facturi)`),
    ``,
    `Top 5 facturi cu risc (sold x vechime):`,
    ...risc.map((c) => `- ${c.nume_firma}: sold ${formatRon(c.sold)}, factura ${c.nr_factura}`),
    ``,
    `Grad Realizare Target (GRT), ultimele ${grt.length} luni:`,
    ...grt.map(
      (g) =>
        `- ${g.month}: target ${formatRon(g.target)}, incasat ${formatRon(g.realizat)}, GRT ${g.grt !== null ? Math.round(g.grt) + "%" : "fara target"}`
    ),
  ];

  return lines.join("\n");
}

async function buildVenituriSummaryText(): Promise<string> {
  const [linii, contracte] = await Promise.all([getVenituriLinii(), getContracte()]);

  const anulCurent = new Date().getFullYear();
  const liniiAnCurent = linii.filter((l) => new Date(l.luna).getFullYear() === anulCurent);

  const totalEstimat = liniiAnCurent.reduce((s, l) => s + l.venit_estimat, 0);
  const totalRealizat = liniiAnCurent.reduce((s, l) => s + (l.venit_realizat ?? 0), 0);
  const grtAnCurent = totalEstimat > 0 ? Math.round((totalRealizat / totalEstimat) * 100) : null;

  const produs = groupByProdus(liniiAnCurent).slice(0, 5);
  const serviciu = groupByServiciu(liniiAnCurent).slice(0, 5);
  const clienti = topClienti(liniiAnCurent, 8);
  const evolutie = buildEvolutieLunara(linii, 6);

  const nrActive = contracte.filter((c) => c.status_contract === "Activ").length;
  const nrInactive = contracte.filter((c) => c.status_contract === "Inactiv").length;

  const lines = [
    `Anul curent (${anulCurent}): venit estimat ${formatEur(totalEstimat)}, realizat ${formatEur(totalRealizat)}, grad realizare ${grtAnCurent !== null ? grtAnCurent + "%" : "necunoscut"}`,
    `Contracte: ${nrActive} active, ${nrInactive} inactive`,
    ``,
    `Top 5 produse (dupa venit realizat):`,
    ...produs.map(
      (p) => `- ${p.cheie}: realizat ${formatEur(p.realizat)} din estimat ${formatEur(p.estimat)} (${p.count} linii)`
    ),
    ``,
    `Top 5 servicii (dupa venit realizat):`,
    ...serviciu.map((s) => `- ${s.cheie}: realizat ${formatEur(s.realizat)} din estimat ${formatEur(s.estimat)}`),
    ``,
    `Top 8 clienti (dupa venit realizat, anul curent):`,
    ...clienti.map((c) => `- ${c.cheie}: realizat ${formatEur(c.realizat)} din estimat ${formatEur(c.estimat)}`),
    ``,
    `Evolutie lunara, ultimele 6 luni:`,
    ...evolutie.map((e) => `- ${e.label}: estimat ${formatEur(e.estimat)}, realizat ${formatEur(e.realizat)}`),
  ];

  return lines.join("\n");
}

async function buildCrmSummaryText(): Promise<string> {
  const opportunities = await getOpportunities();
  const kpis = computeKpis(opportunities);
  const stage = groupByStage(opportunities);
  const status = groupByStatus(opportunities);
  const risc = buildRiskLists(opportunities);

  const lines = [
    `ARR activ: ${formatEur(kpis.totalArr)} (${kpis.activeCount} oportunitati active, din ${kpis.totalOpportunities} total, exclus Lead Pool)`,
    `Forecast ponderat: ${formatEur(kpis.weightedForecast)}`,
    `Forecast implementare: ${formatEur(kpis.forecastImplementare)}`,
    `Castigate: ${kpis.wonCount}, Pierdute: ${kpis.lostCount}, Win rate: ${Math.round(kpis.winRate * 100)}%`,
    `Fara next step programat: ${kpis.faraNextStepCount} oportunitati active`,
    `Lead Pool (suspecti reci, neinclusi in forecast): ${kpis.leadPoolCount}`,
    ``,
    `Oportunitati pe stage:`,
    ...stage.map((s) => `- ${s.stage}: ${s.count} oportunitati, valoare ${formatEur(s.value)}`),
    ``,
    `Distributie status:`,
    ...status.map((s) => `- ${s.status}: ${s.count}`),
    ``,
    `Riscuri vizibile in pipeline:`,
    `- Ofertare fara follow-up recent: ${risc.ofertareFaraFollowUp.length} oportunitati`,
    `- Negociere stagnanta: ${risc.negociereStagnanta.length} oportunitati`,
    `- Probabilitate mare (peste 50%) fara actiune programata: ${risc.probabilitateMareFaraActiune.length} oportunitati`,
    `- Amanate fara data de revenire: ${risc.amanateFaraDataRevenire.length} oportunitati`,
  ];

  return lines.join("\n");
}

async function buildRaportComercialSummaryText(): Promise<string> {
  const opportunities = await getOpportunities();
  const kpis = computePipelineReportKpis(opportunities);
  const stage = groupByStage(opportunities);

  const lines = [
    `Pipeline activ SaaS: ${formatEur(kpis.pipelineActivSaas)}`,
    `Pipeline activ On-premise: ${formatEur(kpis.pipelineActivOnprem)}`,
    `Pipeline activ Implementare: ${formatEur(kpis.pipelineActivImplementare)}`,
    `Pipeline total activ: ${formatEur(kpis.pipelineTotalActiv)}`,
    `Forecast total SaaS: ${formatEur(kpis.forecastTotalSaas)}`,
    `Forecast total On-premise: ${formatEur(kpis.forecastTotalOnpremise)}`,
    `Forecast total: ${formatEur(kpis.forecastTotal)}`,
    `Oportunitati active: ${kpis.oportunitatiActive}`,
    `Win rate: ${Math.round(kpis.winRate * 100)}%`,
    ``,
    `Distributie pe stage:`,
    ...stage.map((s) => `- ${s.stage}: ${s.count} oportunitati, valoare ${formatEur(s.value)}`),
  ];

  return lines.join("\n");
}

export async function generateCrmInsightAction(): Promise<{
  success: boolean;
  message?: string;
  data?: FinancialInsightResult;
}> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot genera interpretari AI." };

  try {
    const sumar = await buildCrmSummaryText();
    const raw = await askClaude({
      system: buildCrmInsightSystemPrompt(),
      prompt: buildCrmInsightPrompt(sumar),
      maxTokens: 4000,
      onUsage: (usage) => logAiUsage(supabase, "crm_insight", usage),
    });
    const parsed = parseFinancialInsightResponse(raw);
    await saveInsightToHistory(supabase, "crm_insight", parsed);
    return { success: true, data: parsed };
  } catch (err) {
    return handleAiError(err);
  }
}

export async function generateRaportComercialInsightAction(): Promise<{
  success: boolean;
  message?: string;
  data?: FinancialInsightResult;
}> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot genera interpretari AI." };

  try {
    const sumar = await buildRaportComercialSummaryText();
    const raw = await askClaude({
      system: buildCrmInsightSystemPrompt(),
      prompt: buildCrmInsightPrompt(sumar),
      maxTokens: 4000,
      onUsage: (usage) => logAiUsage(supabase, "raport_comercial_insight", usage),
    });
    const parsed = parseFinancialInsightResponse(raw);
    await saveInsightToHistory(supabase, "raport_comercial_insight", parsed);
    return { success: true, data: parsed };
  } catch (err) {
    return handleAiError(err);
  }
}

export async function generateCreanteInsightAction(): Promise<{
  success: boolean;
  message?: string;
  data?: FinancialInsightResult;
}> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot genera interpretari AI." };

  try {
    const sumar = await buildCreanteSummaryText();
    const raw = await askClaude({
      system: buildCreanteInsightSystemPrompt(),
      prompt: buildCreanteInsightPrompt(sumar),
      maxTokens: 4000,
      onUsage: (usage) => logAiUsage(supabase, "creante_insight", usage),
    });
    const parsed = parseFinancialInsightResponse(raw);
    await saveInsightToHistory(supabase, "creante_insight", parsed);
    return { success: true, data: parsed };
  } catch (err) {
    return handleAiError(err);
  }
}

export async function generateVenituriInsightAction(): Promise<{
  success: boolean;
  message?: string;
  data?: FinancialInsightResult;
}> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot genera interpretari AI." };

  try {
    const sumar = await buildVenituriSummaryText();
    const raw = await askClaude({
      system: buildVenituriInsightSystemPrompt(),
      prompt: buildVenituriInsightPrompt(sumar),
      maxTokens: 4000,
      onUsage: (usage) => logAiUsage(supabase, "venituri_insight", usage),
    });
    const parsed = parseFinancialInsightResponse(raw);
    await saveInsightToHistory(supabase, "venituri_insight", parsed);
    return { success: true, data: parsed };
  } catch (err) {
    return handleAiError(err);
  }
}

"use server";

import { createClient } from "@/lib/supabase/server";
import { askClaude, AiConfigError, AiRequestError } from "@/lib/ai/client";
import { logAiUsage } from "@/lib/ai/usage-log";
import {
  buildCreanteInsightSystemPrompt,
  buildCreanteInsightPrompt,
  buildObligatiiInsightSystemPrompt,
  buildObligatiiInsightPrompt,
  buildVenituriInsightSystemPrompt,
  buildVenituriInsightPrompt,
  buildCrmInsightSystemPrompt,
  buildCrmInsightPrompt,
  buildCheltuieliInsightSystemPrompt,
  buildCheltuieliInsightPrompt,
  buildManagementInsightSystemPrompt,
  buildManagementInsightPrompt,
  buildPlInsightSystemPrompt,
  buildPlInsightPrompt,
  buildCashflowInsightSystemPrompt,
  buildCashflowInsightPrompt,
  parseFinancialInsightResponse,
  type FinancialInsightResult,
} from "@/lib/ai/financial-prompts";
import { getNomenclatoare } from "@/lib/data/nomenclatoare";
import { buildPlReport } from "@/lib/pl-analytics";
import { buildCashflowReport } from "@/lib/cashflow-analytics";
import { getCreante, getCreanteIncasari, getCreanteTargetsLunare } from "@/lib/data/creante";
import { computeCreanteSummary } from "@/lib/creante-analytics";
import { groupByAgingCreante, topRiscCreante, buildGrtSeries } from "@/lib/creante-dashboard-analytics";
import { getObligatii, getObligatiiPlati, getObligatiiTargetsLunare } from "@/lib/data/obligatii";
import { computeObligatiiSummary } from "@/lib/obligatii-analytics";
import {
  groupByAgingObligatii,
  topRiscObligatii,
  buildGrtSeries as buildGrtSeriesObligatii,
} from "@/lib/obligatii-dashboard-analytics";
import { formatEur, formatRon } from "@/lib/format";
import { getVenituriLinii, getContracte } from "@/lib/data/venituri";
import { getCheltuieliLinii, getContracteCheltuieli } from "@/lib/data/cheltuieli";
import { getAngajatiLunar } from "@/lib/data/angajati";
import { groupByIncadrare, groupByClasa } from "@/lib/cheltuieli-dashboard-analytics";
import { buildManagementMonthly, computeManagementSummary } from "@/lib/management-analytics";
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

async function buildCheltuieliSummaryText(): Promise<string> {
  const [linii, contracte] = await Promise.all([getCheltuieliLinii(), getContracteCheltuieli()]);

  const anulCurent = new Date().getFullYear();
  const liniiAnCurent = linii.filter((l) => new Date(l.luna).getFullYear() === anulCurent);

  const totalPrognozat = liniiAnCurent.reduce((s, l) => s + l.valoare_prognozata, 0);
  const totalRealizat = liniiAnCurent.reduce((s, l) => s + (l.valoare_realizata ?? 0), 0);
  const grtAnCurent = totalPrognozat > 0 ? Math.round((totalRealizat / totalPrognozat) * 100) : null;

  const incadrare = groupByIncadrare(liniiAnCurent).slice(0, 5);
  const clasa = groupByClasa(liniiAnCurent).slice(0, 8);

  const nrActive = contracte.filter((c) => c.status_contract === "Activ").length;
  const nrInactive = contracte.filter((c) => c.status_contract === "Inactiv").length;

  const lines = [
    `Anul curent (${anulCurent}): cheltuiala prognozata ${formatEur(totalPrognozat)}, realizata ${formatEur(totalRealizat)}, grad realizare ${grtAnCurent !== null ? grtAnCurent + "%" : "necunoscut"}`,
    `Contracte de cheltuiala: ${nrActive} active, ${nrInactive} inactive`,
    ``,
    `Top 5 incadrari (dupa cheltuiala realizata):`,
    ...incadrare.map((i) => `- ${i.cheie}: realizat ${formatEur(i.realizat)} din prognozat ${formatEur(i.estimat)}`),
    ``,
    `Top 8 clase (dupa cheltuiala realizata):`,
    ...clasa.map((c) => `- ${c.cheie}: realizat ${formatEur(c.realizat)} din prognozat ${formatEur(c.estimat)}`),
  ];

  return lines.join("\n");
}

export async function generateCheltuieliInsightAction(): Promise<{
  success: boolean;
  message?: string;
  data?: FinancialInsightResult;
}> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot genera interpretari AI." };

  try {
    const sumar = await buildCheltuieliSummaryText();
    const raw = await askClaude({
      system: buildCheltuieliInsightSystemPrompt(),
      prompt: buildCheltuieliInsightPrompt(sumar),
      maxTokens: 4000,
      onUsage: (usage) => logAiUsage(supabase, "cheltuieli_insight", usage),
    });
    return { success: true, data: parseFinancialInsightResponse(raw) };
  } catch (err) {
    return handleAiError(err);
  }
}

async function buildManagementSummaryText(): Promise<string> {
  const [venituriLinii, cheltuieliLinii, angajati] = await Promise.all([
    getVenituriLinii(),
    getCheltuieliLinii(),
    getAngajatiLunar(),
  ]);

  const angajatiLookup = new Map(angajati.map((a) => [`${a.an}-${String(a.luna).padStart(2, "0")}`, a.nr_angajati]));

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const monthly = buildManagementMonthly(venituriLinii, cheltuieliLinii, angajatiLookup, from, now);
  const summary = computeManagementSummary(monthly);

  const lines = [
    `Ultimele 12 luni: venit realizat ${formatEur(summary.venitRealizat)} (estimat ${formatEur(summary.venitEstimat)})`,
    `Cheltuieli realizate ${formatEur(summary.cheltuieliRealizat)} (estimat ${formatEur(summary.cheltuieliEstimat)})`,
    `Profit realizat ${formatEur(summary.profitRealizat)} (estimat ${formatEur(summary.profitEstimat)})`,
    summary.productivitateMedieRealizat !== null
      ? `Productivitate medie: ${formatEur(summary.productivitateMedieRealizat)} venit / angajat / luna`
      : `Productivitate: necunoscuta (nu e completat numarul de angajati)`,
    summary.costPerAngajatMediuRealizat !== null
      ? `Cost mediu per angajat: ${formatEur(summary.costPerAngajatMediuRealizat)} / luna`
      : `Cost per angajat: necunoscut (nu e completat numarul de angajati)`,
    ``,
    `Evolutie lunara (Venit realizat / Cheltuieli realizate / Profit):`,
    ...monthly.map(
      (m) =>
        `- ${m.label}: venit ${formatEur(m.venitRealizat)}, cheltuieli ${formatEur(m.cheltuieliRealizat)}, profit ${formatEur(m.venitRealizat - m.cheltuieliRealizat)}`
    ),
  ];

  return lines.join("\n");
}

export async function generateManagementInsightAction(): Promise<{
  success: boolean;
  message?: string;
  data?: FinancialInsightResult;
}> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot genera interpretari AI." };

  try {
    const sumar = await buildManagementSummaryText();
    const raw = await askClaude({
      system: buildManagementInsightSystemPrompt(),
      prompt: buildManagementInsightPrompt(sumar),
      maxTokens: 4000,
      onUsage: (usage) => logAiUsage(supabase, "management_insight", usage),
    });
    return { success: true, data: parseFinancialInsightResponse(raw) };
  } catch (err) {
    return handleAiError(err);
  }
}

async function buildPlSummaryText(): Promise<string> {
  const [venituriLinii, cheltuieliLinii, nomenclatoare] = await Promise.all([
    getVenituriLinii(),
    getCheltuieliLinii(),
    getNomenclatoare(),
  ]);
  const incadrareOrdine = (nomenclatoare.cheltuiala_incadrare ?? []).map((n) => n.valoare);

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const report = buildPlReport(venituriLinii, cheltuieliLinii, incadrareOrdine, from, now);

  const grupeSortate = [...report.costuriGrupe].sort((a, b) => b.totalRealizat - a.totalRealizat);

  const lines = [
    `Ultimele 12 luni:`,
    `Total Venituri: realizat ${formatEur(report.totalVenituri.totalRealizat)} (estimat ${formatEur(report.totalVenituri.totalEstimat)})`,
    `  - din care Recurente: realizat ${formatEur(report.venituri.linii[0]?.totalRealizat ?? 0)}, Nerecurente: realizat ${formatEur(report.venituri.linii[1]?.totalRealizat ?? 0)}`,
    `Total Costuri: realizat ${formatEur(report.totalCosturi.totalRealizat)} (estimat ${formatEur(report.totalCosturi.totalEstimat)})`,
    `Profit: realizat ${formatEur(report.profit.totalRealizat)} (estimat ${formatEur(report.profit.totalEstimat)})`,
    ``,
    `Costuri pe grupe (Incadrare), realizat vs. estimat, sortate descrescator dupa realizat:`,
    ...grupeSortate.map(
      (g) =>
        `- ${g.incadrare}: realizat ${formatEur(g.totalRealizat)} (estimat ${formatEur(g.totalEstimat)})`
    ),
  ];

  return lines.join("\n");
}

export async function generatePlInsightAction(): Promise<{
  success: boolean;
  message?: string;
  data?: FinancialInsightResult;
}> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot genera interpretari AI." };

  try {
    const sumar = await buildPlSummaryText();
    const raw = await askClaude({
      system: buildPlInsightSystemPrompt(),
      prompt: buildPlInsightPrompt(sumar),
      maxTokens: 4000,
      onUsage: (usage) => logAiUsage(supabase, "pl_insight", usage),
    });
    return { success: true, data: parseFinancialInsightResponse(raw) };
  } catch (err) {
    return handleAiError(err);
  }
}

async function buildCashflowSummaryText(): Promise<string> {
  const [creante, creanteIncasari, obligatii, obligatiiPlati] = await Promise.all([
    getCreante(),
    getCreanteIncasari(),
    getObligatii(),
    getObligatiiPlati(),
  ]);

  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 5, 1);
  const report = buildCashflowReport(creante, obligatii, creanteIncasari, obligatiiPlati, from, now < to ? now : to);

  const lines = [
    `Cashflow (ultimele 6 luni + urmatoarele, dupa scadenta):`,
    `Total Incasari: realizat ${formatRon(report.totalRealizat.incasari)}, estimat ${formatRon(report.totalEstimat.incasari)}`,
    `Total Plati: realizat ${formatRon(report.totalRealizat.plati)}, estimat ${formatRon(report.totalEstimat.plati)}`,
    `Cashflow Net: realizat ${formatRon(report.totalRealizat.net)}, estimat ${formatRon(report.totalEstimat.net)}`,
    ``,
    `Detaliu pe luna (Estimat):`,
    ...report.luni.map(
      (l) =>
        `- ${l.label}: incasari ${formatRon(report.estimat[l.luna].incasari)}, plati ${formatRon(report.estimat[l.luna].plati)}, net ${formatRon(report.estimat[l.luna].net)}`
    ),
  ];

  return lines.join("\n");
}

export async function generateCashflowInsightAction(): Promise<{
  success: boolean;
  message?: string;
  data?: FinancialInsightResult;
}> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot genera interpretari AI." };

  try {
    const sumar = await buildCashflowSummaryText();
    const raw = await askClaude({
      system: buildCashflowInsightSystemPrompt(),
      prompt: buildCashflowInsightPrompt(sumar),
      maxTokens: 4000,
      onUsage: (usage) => logAiUsage(supabase, "cashflow_insight", usage),
    });
    return { success: true, data: parseFinancialInsightResponse(raw) };
  } catch (err) {
    return handleAiError(err);
  }
}

async function buildObligatiiSummaryText(): Promise<string> {
  const [obligatii, plati, targets] = await Promise.all([
    getObligatii(),
    getObligatiiPlati(),
    getObligatiiTargetsLunare(),
  ]);

  const summary = computeObligatiiSummary(obligatii);
  const aging = groupByAgingObligatii(obligatii);
  const risc = topRiscObligatii(obligatii, 5);
  const platiFlat = Object.values(plati).flat();
  const grt = buildGrtSeriesObligatii(platiFlat, targets, 5);

  const lines = [
    `Sold total restant (de platit): ${formatRon(summary.totalSoldRestant)} (${summary.nrFacturiRestante} facturi)`,
    `Target propus luna curenta: ${formatRon(summary.targetPropus)} (${summary.nrFacturiPropuse} facturi)`,
    ``,
    `Vechime sold restant (aging):`,
    ...aging.map((a) => `- ${a.label}: ${formatRon(a.sold)} (${a.count} facturi)`),
    ``,
    `Top 5 facturi cu risc (sold x vechime):`,
    ...risc.map((o) => `- ${o.nume_furnizor}: sold ${formatRon(o.sold)}, factura ${o.nr_factura}`),
    ``,
    `Grad Realizare Target (GRT) plati, ultimele ${grt.length} luni:`,
    ...grt.map(
      (g) =>
        `- ${g.month}: target ${formatRon(g.target)}, platit ${formatRon(g.realizat)}, GRT ${g.grt !== null ? Math.round(g.grt) + "%" : "fara target"}`
    ),
  ];

  return lines.join("\n");
}

export async function generateObligatiiInsightAction(): Promise<{
  success: boolean;
  message?: string;
  data?: FinancialInsightResult;
}> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot genera interpretari AI." };

  try {
    const sumar = await buildObligatiiSummaryText();
    const raw = await askClaude({
      system: buildObligatiiInsightSystemPrompt(),
      prompt: buildObligatiiInsightPrompt(sumar),
      maxTokens: 4000,
      onUsage: (usage) => logAiUsage(supabase, "obligatii_insight", usage),
    });
    return { success: true, data: parseFinancialInsightResponse(raw) };
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

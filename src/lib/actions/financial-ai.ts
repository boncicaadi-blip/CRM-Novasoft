"use server";

import { createClient } from "@/lib/supabase/server";
import { askClaude, AiConfigError, AiRequestError } from "@/lib/ai/client";
import {
  buildCreanteInsightSystemPrompt,
  buildCreanteInsightPrompt,
  buildVenituriInsightSystemPrompt,
  buildVenituriInsightPrompt,
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

async function requireAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { isAdmin: false };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  return { isAdmin: profile?.role === "admin" };
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

export async function generateCreanteInsightAction(): Promise<{
  success: boolean;
  message?: string;
  data?: FinancialInsightResult;
}> {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot genera interpretari AI." };

  try {
    const sumar = await buildCreanteSummaryText();
    const raw = await askClaude({
      system: buildCreanteInsightSystemPrompt(),
      prompt: buildCreanteInsightPrompt(sumar),
      maxTokens: 900,
    });
    return { success: true, data: parseFinancialInsightResponse(raw) };
  } catch (err) {
    return handleAiError(err);
  }
}

export async function generateVenituriInsightAction(): Promise<{
  success: boolean;
  message?: string;
  data?: FinancialInsightResult;
}> {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot genera interpretari AI." };

  try {
    const sumar = await buildVenituriSummaryText();
    const raw = await askClaude({
      system: buildVenituriInsightSystemPrompt(),
      prompt: buildVenituriInsightPrompt(sumar),
      maxTokens: 900,
    });
    return { success: true, data: parseFinancialInsightResponse(raw) };
  } catch (err) {
    return handleAiError(err);
  }
}

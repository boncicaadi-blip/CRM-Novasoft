import { createClient } from "@/lib/supabase/server";
import { estimateCostUsd } from "@/lib/ai/pricing";

export interface AiUsageRow {
  id: string;
  feature: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  thinking_tokens: number;
  success: boolean;
  user_id: string | null;
  creat_la: string;
}

export async function getAiUsageLog(limit = 500): Promise<AiUsageRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_usage_log")
    .select("*")
    .order("creat_la", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getAiUsageLog error:", error.message);
    return [];
  }
  return data ?? [];
}

export interface AiUsageSummary {
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  totalCostUsd: number;
  costLast30DaysUsd: number;
  callsLast30Days: number;
  byFeature: { feature: string; calls: number; costUsd: number }[];
  byDay: { day: string; calls: number; costUsd: number }[];
}

const FEATURE_LABELS: Record<string, string> = {
  creante_insight: "Dashboard Creante",
  venituri_insight: "Dashboard Venituri",
  crm_insight: "Dashboard CRM",
  raport_comercial_insight: "Raport Comercial",
  opportunity_summary: "Rezumat oportunitate",
};

export function summarizeAiUsage(rows: AiUsageRow[]): AiUsageSummary {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86_400_000);

  let totalCostUsd = 0;
  let costLast30DaysUsd = 0;
  let callsLast30Days = 0;
  let successCalls = 0;

  const byFeatureMap = new Map<string, { calls: number; costUsd: number }>();
  const byDayMap = new Map<string, { calls: number; costUsd: number }>();

  for (const row of rows) {
    const when = new Date(row.creat_la);
    const cost = estimateCostUsd(row.model, row.input_tokens, row.output_tokens, when);
    totalCostUsd += cost;
    if (row.success) successCalls += 1;

    if (when >= thirtyDaysAgo) {
      costLast30DaysUsd += cost;
      callsLast30Days += 1;
    }

    const featureLabel = FEATURE_LABELS[row.feature] ?? row.feature;
    const f = byFeatureMap.get(featureLabel) ?? { calls: 0, costUsd: 0 };
    f.calls += 1;
    f.costUsd += cost;
    byFeatureMap.set(featureLabel, f);

    const dayKey = row.creat_la.slice(0, 10);
    const d = byDayMap.get(dayKey) ?? { calls: 0, costUsd: 0 };
    d.calls += 1;
    d.costUsd += cost;
    byDayMap.set(dayKey, d);
  }

  return {
    totalCalls: rows.length,
    successCalls,
    failedCalls: rows.length - successCalls,
    totalCostUsd,
    costLast30DaysUsd,
    callsLast30Days,
    byFeature: Array.from(byFeatureMap.entries())
      .map(([feature, v]) => ({ feature, ...v }))
      .sort((a, b) => b.costUsd - a.costUsd),
    byDay: Array.from(byDayMap.entries())
      .map(([day, v]) => ({ day, ...v }))
      .sort((a, b) => (a.day < b.day ? 1 : -1))
      .slice(0, 30),
  };
}

export { FEATURE_LABELS };

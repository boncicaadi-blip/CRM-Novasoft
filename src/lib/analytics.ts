import type { Opportunity, OpportunityHistoryRow } from "@/types/opportunity";

export function computeKpis(opportunities: Opportunity[]) {
  const active = opportunities.filter((o) => o.status === "Activa");
  const won = opportunities.filter((o) => o.status === "Castigata");
  const lost = opportunities.filter((o) => o.status === "Pierduta");

  const totalArr = active.reduce((s, o) => s + (o.arr_synergo ?? 0), 0);
  const totalMrr = active.reduce((s, o) => s + (o.mrr_synergo ?? 0), 0);
  const weightedForecast = active.reduce((s, o) => s + (o.forecast_total_saas ?? 0), 0);
  const closedCount = won.length + lost.length;
  const winRate = closedCount > 0 ? won.length / closedCount : 0;

  return {
    totalOpportunities: opportunities.length,
    activeCount: active.length,
    wonCount: won.length,
    lostCount: lost.length,
    totalArr,
    totalMrr,
    weightedForecast,
    winRate,
  };
}

export function groupByStage(opportunities: Opportunity[]) {
  const map = new Map<string, { stage: string; count: number; value: number }>();
  for (const o of opportunities) {
    const entry = map.get(o.stage) ?? { stage: o.stage, count: 0, value: 0 };
    entry.count += 1;
    entry.value += (o.arr_synergo ?? 0) + (o.valoare_implementare_synergo ?? 0);
    map.set(o.stage, entry);
  }
  return Array.from(map.values());
}

export function groupByStatus(opportunities: Opportunity[]) {
  const map = new Map<string, number>();
  for (const o of opportunities) {
    map.set(o.status, (map.get(o.status) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
}

export function groupByResponsabil(opportunities: Opportunity[]) {
  const map = new Map<string, { name: string; count: number; arr: number }>();
  for (const o of opportunities) {
    const name = o.profiles?.full_name ?? "Neasignat";
    const entry = map.get(name) ?? { name, count: 0, arr: 0 };
    entry.count += 1;
    entry.arr += o.arr_synergo ?? 0;
    map.set(name, entry);
  }
  return Array.from(map.values()).sort((a, b) => b.arr - a.arr);
}

export function groupByJudet(opportunities: Opportunity[], top = 8) {
  const map = new Map<string, number>();
  for (const o of opportunities) {
    const key = o.judet ?? "Necunoscut";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([judet, count]) => ({ judet, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, top);
}

export function groupByCanalIntrare(opportunities: Opportunity[]) {
  const map = new Map<string, number>();
  for (const o of opportunities) {
    const key = o.canal_intrare ?? "Necunoscut";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([canal, count]) => ({ canal, count }));
}

export function buildTimeSeries(history: OpportunityHistoryRow[]) {
  // Grupam pe luna (YYYY-MM) si luam ultimul snapshot din fiecare luna per oportunitate,
  // apoi sumam ARR-ul activ la acel moment.
  const byMonthAndOpp = new Map<string, Map<string, OpportunityHistoryRow>>();

  for (const row of history) {
    const month = row.snapshot_date.slice(0, 7); // YYYY-MM
    if (!byMonthAndOpp.has(month)) byMonthAndOpp.set(month, new Map());
    const monthMap = byMonthAndOpp.get(month)!;
    const existing = monthMap.get(row.opportunity_id);
    if (!existing || row.snapshot_date > existing.snapshot_date) {
      monthMap.set(row.opportunity_id, row);
    }
  }

  const months = Array.from(byMonthAndOpp.keys()).sort();
  return months.map((month) => {
    const rows = Array.from(byMonthAndOpp.get(month)!.values());
    const arr = rows.reduce((s, r) => s + (r.arr_synergo ?? 0), 0);
    const count = rows.length;
    return { month, arr, count };
  });
}

export function upcomingActions(opportunities: Opportunity[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return opportunities
    .filter((o) => o.data_actiune && o.status_actiune === "Planificata")
    .map((o) => ({
      id: o.id,
      nume: o.nume_potential,
      actiune: o.actiune,
      data: o.data_actiune!,
      isOverdue: new Date(o.data_actiune!) < today,
    }))
    .sort((a, b) => a.data.localeCompare(b.data))
    .slice(0, 8);
}

export type ActionCalendarStatus = "restanta" | "viitoare" | "finalizata";

export interface CalendarAction {
  id: string;
  opportunityId: string;
  numePotential: string;
  actiune: string | null;
  observatiiActiune: string | null;
  dataFinalizare: string | null;
  stage: string;
  date: string; // YYYY-MM-DD
  status: ActionCalendarStatus;
}

/**
 * Construieste lista de "actiuni de calendar" dintr-un set de oportunitati.
 * O oportunitate produce o actiune de calendar doar daca are data_actiune setata.
 * Status-ul (restanta/viitoare/finalizata) e derivat, nu stocat separat.
 */
export function buildCalendarActions(opportunities: Opportunity[]): CalendarAction[] {
  const todayStr = new Date().toISOString().slice(0, 10);

  return opportunities
    .filter((o) => !!o.data_actiune)
    .map((o) => {
      const date = o.data_actiune!.slice(0, 10);
      let status: ActionCalendarStatus;
      if (o.status_actiune === "Finalizata") {
        status = "finalizata";
      } else if (date < todayStr) {
        status = "restanta";
      } else {
        status = "viitoare";
      }
      return {
        id: o.id,
        opportunityId: o.id,
        numePotential: o.nume_potential,
        actiune: o.actiune,
        observatiiActiune: o.observatii_actiune,
        dataFinalizare: o.data_finalizare_actiune,
        stage: o.stage,
        date,
        status,
      };
    });
}

export function calendarActionCounts(actions: CalendarAction[]) {
  const todayStr = new Date().toISOString().slice(0, 10);
  return {
    today: actions.filter((a) => a.date === todayStr).length,
    overdue: actions.filter((a) => a.status === "restanta").length,
    upcoming: actions.filter((a) => a.status === "viitoare").length,
  };
}

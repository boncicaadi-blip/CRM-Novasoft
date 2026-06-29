import type { Opportunity, OpportunityHistoryRow } from "@/types/opportunity";

export interface DashboardFilters {
  stage: string | null;
  status: string | null;
  responsabil: string | null;
  judet: string | null;
  /** Interval de date (inclusiv) selectat prin drag pe graficul de evolutie. */
  dateFrom: string | null;
  dateTo: string | null;
}

export const EMPTY_FILTERS: DashboardFilters = {
  stage: null,
  status: null,
  responsabil: null,
  judet: null,
  dateFrom: null,
  dateTo: null,
};

export function hasActiveFilters(filters: DashboardFilters): boolean {
  return Object.values(filters).some((v) => v !== null);
}

/**
 * Aplica filtrele curente (din click pe grafice sau dropdown-uri de sus)
 * peste lista de oportunitati. Filtrul de data se aplica pe updated_at,
 * ca aproximare rezonabila a "activitatii in acel interval" - istoricul
 * complet per-zi ar necesita un join cu opportunity_history per filtru,
 * mult mai costisitor pentru un simplu cross-filter vizual.
 */
export function applyDashboardFilters(
  opportunities: Opportunity[],
  filters: DashboardFilters
): Opportunity[] {
  let rows = opportunities;
  if (filters.stage) rows = rows.filter((o) => o.stage === filters.stage);
  if (filters.status) rows = rows.filter((o) => o.status === filters.status);
  if (filters.responsabil) {
    rows = rows.filter((o) => (o.profiles?.full_name ?? "Neasignat") === filters.responsabil);
  }
  if (filters.judet) rows = rows.filter((o) => (o.judet ?? "Necunoscut") === filters.judet);
  if (filters.dateFrom) {
    rows = rows.filter((o) => o.updated_at.slice(0, 10) >= filters.dateFrom!);
  }
  if (filters.dateTo) {
    rows = rows.filter((o) => o.updated_at.slice(0, 10) <= filters.dateTo!);
  }
  return rows;
}

export function computeKpis(opportunities: Opportunity[]) {
  const active = opportunities.filter((o) => o.status === "Activa");
  const won = opportunities.filter((o) => o.status === "Castigata");
  const lost = opportunities.filter((o) => o.status === "Pierduta");
  const fataNextStep = active.filter((o) => !o.actiune || !o.data_actiune);

  const totalArr = active.reduce((s, o) => s + (o.arr_synergo ?? 0), 0);
  const totalMrr = active.reduce((s, o) => s + (o.mrr_synergo ?? 0), 0);
  const weightedForecast = active.reduce((s, o) => s + (o.forecast_total_saas ?? 0), 0);
  const forecastImplementare = active.reduce((s, o) => s + (o.forecast_implementare ?? 0), 0);
  const closedCount = won.length + lost.length;
  const winRate = closedCount > 0 ? won.length / closedCount : 0;

  return {
    totalOpportunities: opportunities.length,
    activeCount: active.length,
    wonCount: won.length,
    lostCount: lost.length,
    faraNextStepCount: fataNextStep.length,
    totalArr,
    totalMrr,
    weightedForecast,
    forecastImplementare,
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

export interface JudetMapDatum {
  judet: string;
  count: number;
  arr: number;
  forecast: number;
}

/** Agregare completa pe judet, pentru harta choropleth - toate judetele, nu doar top N. */
export function groupByJudetFull(opportunities: Opportunity[]): JudetMapDatum[] {
  const map = new Map<string, JudetMapDatum>();
  for (const o of opportunities) {
    const key = o.judet ?? "Necunoscut";
    const entry = map.get(key) ?? { judet: key, count: 0, arr: 0, forecast: 0 };
    entry.count += 1;
    entry.arr += o.arr_synergo ?? 0;
    entry.forecast += o.forecast_total_saas ?? 0;
    map.set(key, entry);
  }
  return Array.from(map.values());
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
    // Prima si ultima zi calendaristica a lunii - folosite pentru a converti
    // o selectie de luni (drag pe grafic) intr-un interval real de date,
    // aplicabil ca filtru pe updated_at.
    const [y, m] = month.split("-").map(Number);
    const dateFrom = `${month}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const dateTo = `${month}-${String(lastDay).padStart(2, "0")}`;
    return { month, arr, count, dateFrom, dateTo };
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

export type ActionWorkItemFilter = "azi" | "intarziate" | "saptamana" | "fara_next_step" | "finalizate";

export interface ActionWorkItem {
  opportunity: Opportunity;
  daysOverdue: number;
}

/**
 * Pagina operationala "Actiuni" (B-05 din roadmap): clasifica oportunitatile
 * active in functie de data actiunii lor curente, plus cele fara next step
 * deloc completat - exact regula B-04 ("nicio oportunitate activa fara
 * next step"), dar aici afisata ca lista de lucru, nu ca eroare de salvare.
 */
export function buildActionWorkItems(
  opportunities: Opportunity[],
  filter: ActionWorkItemFilter
): ActionWorkItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);
  const in7DaysStr = in7Days.toISOString().slice(0, 10);

  let rows: Opportunity[];

  if (filter === "fara_next_step") {
    rows = opportunities.filter((o) => o.status === "Activa" && (!o.actiune || !o.data_actiune));
  } else if (filter === "finalizate") {
    rows = opportunities.filter((o) => o.status_actiune === "Finalizata");
  } else {
    rows = opportunities.filter((o) => o.data_actiune && o.status_actiune === "Planificata");
    if (filter === "azi") {
      rows = rows.filter((o) => o.data_actiune!.slice(0, 10) === todayStr);
    } else if (filter === "intarziate") {
      rows = rows.filter((o) => o.data_actiune!.slice(0, 10) < todayStr);
    } else if (filter === "saptamana") {
      rows = rows.filter(
        (o) => o.data_actiune!.slice(0, 10) >= todayStr && o.data_actiune!.slice(0, 10) <= in7DaysStr
      );
    }
  }

  return rows
    .map((o) => {
      const daysOverdue = o.data_actiune
        ? Math.floor((today.getTime() - new Date(o.data_actiune.slice(0, 10)).getTime()) / 86400000)
        : 0;
      return { opportunity: o, daysOverdue };
    })
    .sort((a, b) => {
      // Intarziate primele, apoi valoare forecast descrescatoare (cf. cerinta B-05)
      if (a.daysOverdue !== b.daysOverdue) return b.daysOverdue - a.daysOverdue;
      const valA = (a.opportunity.forecast_total_saas ?? 0) + (a.opportunity.forecast_total_onpremise ?? 0);
      const valB = (b.opportunity.forecast_total_saas ?? 0) + (b.opportunity.forecast_total_onpremise ?? 0);
      return valB - valA;
    });
}

export function countActionWorkItems(opportunities: Opportunity[]) {
  return {
    azi: buildActionWorkItems(opportunities, "azi").length,
    intarziate: buildActionWorkItems(opportunities, "intarziate").length,
    saptamana: buildActionWorkItems(opportunities, "saptamana").length,
    faraNextStep: buildActionWorkItems(opportunities, "fara_next_step").length,
    finalizate: buildActionWorkItems(opportunities, "finalizate").length,
  };
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

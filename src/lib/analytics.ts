import type { Opportunity, OpportunityHistoryRow, TimelineEntry } from "@/types/opportunity";
import { getTodayISO, toRomaniaISO } from "@/lib/date";

export type PeriodPreset = "saptamana" | "luna" | "trimestru" | "an" | "custom" | null;

export interface DashboardFilters {
  stages: string[];
  statuses: string[];
  responsabili: string[];
  judete: string[];
  /** Interval de date (inclusiv) - din presetare rapida SAU din drag pe graficul de evolutie. */
  dateFrom: string | null;
  dateTo: string | null;
  periodPreset: PeriodPreset;
}

export const EMPTY_FILTERS: DashboardFilters = {
  stages: [],
  statuses: [],
  responsabili: [],
  judete: [],
  dateFrom: null,
  dateTo: null,
  periodPreset: null,
};

export function hasActiveFilters(filters: DashboardFilters): boolean {
  return (
    filters.stages.length > 0 ||
    filters.statuses.length > 0 ||
    filters.responsabili.length > 0 ||
    filters.judete.length > 0 ||
    filters.dateFrom !== null ||
    filters.dateTo !== null
  );
}

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Luni ca prima zi
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/** Calculeaza dateFrom/dateTo pentru o presetare de perioada, relativ la azi. */
export function computePeriodRange(preset: PeriodPreset): { dateFrom: string; dateTo: string } | null {
  if (!preset || preset === "custom") return null;
  const now = new Date();
  const todayStr = getTodayISO();

  if (preset === "saptamana") {
    const start = startOfWeek(now);
    return { dateFrom: toRomaniaISO(start), dateTo: todayStr };
  }
  if (preset === "luna") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { dateFrom: toRomaniaISO(start), dateTo: todayStr };
  }
  if (preset === "trimestru") {
    const startMonth = Math.floor(now.getMonth() / 3) * 3;
    const start = new Date(now.getFullYear(), startMonth, 1);
    return { dateFrom: toRomaniaISO(start), dateTo: todayStr };
  }
  if (preset === "an") {
    const start = new Date(now.getFullYear(), 0, 1);
    return { dateFrom: toRomaniaISO(start), dateTo: todayStr };
  }
  return null;
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
  if (filters.stages.length > 0) rows = rows.filter((o) => filters.stages.includes(o.stage));
  if (filters.statuses.length > 0) rows = rows.filter((o) => filters.statuses.includes(o.status));
  if (filters.responsabili.length > 0) {
    rows = rows.filter((o) =>
      filters.responsabili.includes(o.profiles?.full_name ?? "Neasignat")
    );
  }
  if (filters.judete.length > 0) {
    rows = rows.filter((o) => filters.judete.includes(o.judet ?? "Necunoscut"));
  }
  if (filters.dateFrom) {
    rows = rows.filter((o) => o.updated_at.slice(0, 10) >= filters.dateFrom!);
  }
  if (filters.dateTo) {
    rows = rows.filter((o) => o.updated_at.slice(0, 10) <= filters.dateTo!);
  }
  return rows;
}

export function computeKpis(opportunities: Opportunity[]) {
  // B-10: Lead Pool e exclus din forecast-ul comercial - sunt suspecti reci,
  // fara interactiune confirmata, nu oportunitati validate. Se afiseaza
  // separat ca volum de prospecti (leadPoolCount), nu ca parte din pipeline activ.
  const leadPool = opportunities.filter((o) => o.stage === "Lead Pool");
  const pipelineReal = opportunities.filter((o) => o.stage !== "Lead Pool");

  const active = pipelineReal.filter((o) => o.status === "Activa");
  const won = pipelineReal.filter((o) => o.status === "Castigata");
  const lost = pipelineReal.filter((o) => o.status === "Pierduta");
  const fataNextStep = active.filter((o) => !o.actiune || !o.data_actiune);

  const totalArr = active.reduce((s, o) => s + (o.arr_synergo ?? 0), 0);
  const totalMrr = active.reduce((s, o) => s + (o.mrr_synergo ?? 0), 0);
  const weightedForecast = active.reduce((s, o) => s + (o.forecast_total_saas ?? 0), 0);
  const forecastImplementare = active.reduce((s, o) => s + (o.forecast_implementare ?? 0), 0);
  const closedCount = won.length + lost.length;
  const winRate = closedCount > 0 ? won.length / closedCount : 0;

  return {
    totalOpportunities: pipelineReal.length,
    leadPoolCount: leadPool.length,
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

export interface PipelineReportKpis {
  pipelineActivSaas: number;
  pipelineActivOnprem: number;
  pipelineActivImplementare: number;
  pipelineTotalActiv: number;
  forecastTotalSaas: number;
  forecastTotalOnpremise: number;
  forecastTotal: number;
  oportunitatiActive: number;
  winRate: number;
}

/**
 * KPI-uri pentru Raportul Comercial (stil Power BI): valori brute de
 * pipeline (neponderate cu probability) separate pe SaaS/OnPrem/Implementare,
 * plus forecast ponderat si win rate. Exclude Lead Pool, la fel ca in
 * computeKpis (B-10).
 */
export function computePipelineReportKpis(opportunities: Opportunity[]): PipelineReportKpis {
  const pipelineReal = opportunities.filter((o) => o.stage !== "Lead Pool");
  const active = pipelineReal.filter((o) => o.status === "Activa");
  const won = pipelineReal.filter((o) => o.status === "Castigata");
  const lost = pipelineReal.filter((o) => o.status === "Pierduta");

  const pipelineActivSaas = active
    .filter((o) => o.pricing_mode === "saas")
    .reduce((s, o) => s + (o.arr_synergo ?? 0), 0);
  const pipelineActivOnprem = active
    .filter((o) => o.pricing_mode === "onpremise")
    .reduce((s, o) => s + (o.licenta_synergo_onpremise ?? 0), 0);
  const pipelineActivImplementare = active.reduce(
    (s, o) => s + (o.valoare_implementare_synergo ?? 0),
    0
  );
  const forecastTotalSaas = active.reduce((s, o) => s + (o.forecast_total_saas ?? 0), 0);
  const forecastTotalOnpremise = active.reduce(
    (s, o) => s + (o.forecast_total_onpremise ?? 0),
    0
  );
  const closedCount = won.length + lost.length;

  return {
    pipelineActivSaas,
    pipelineActivOnprem,
    pipelineActivImplementare,
    pipelineTotalActiv: pipelineActivSaas + pipelineActivOnprem + pipelineActivImplementare,
    forecastTotalSaas,
    forecastTotalOnpremise,
    forecastTotal: forecastTotalSaas + forecastTotalOnpremise,
    oportunitatiActive: active.length,
    winRate: closedCount > 0 ? won.length / closedCount : 0,
  };
}

export function groupByStage(opportunities: Opportunity[], stageOrder?: string[]) {
  const map = new Map<string, { stage: string; count: number; value: number }>();
  for (const o of opportunities) {
    const entry = map.get(o.stage) ?? { stage: o.stage, count: 0, value: 0 };
    entry.count += 1;
    entry.value += (o.arr_synergo ?? 0) + (o.valoare_implementare_synergo ?? 0);
    map.set(o.stage, entry);
  }
  const rows = Array.from(map.values());

  // Sortam dupa ordinea reala a stage-urilor (cea din Kanban/nomenclatoare),
  // nu ordinea de aparitie in date - altfel graficul arata stage-urile
  // intr-o ordine arbitrara, inconsistenta cu restul aplicatiei.
  if (stageOrder && stageOrder.length > 0) {
    rows.sort((a, b) => {
      const ia = stageOrder.indexOf(a.stage);
      const ib = stageOrder.indexOf(b.stage);
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
    });
  }

  return rows;
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

export interface OpportunityScoreBreakdown {
  total: number;
  detalii: { criteriu: string; puncte: number; maxim: number }[];
}

/**
 * B-12: scor 0-100, calculat automat din campuri deja existente (fara
 * campuri noi de completat manual). Ponderile reflecta relevanta comerciala:
 * decidentul si sistemul actual deficitar conteaza mai mult decat canalul
 * de intrare, de exemplu.
 */
export function computeOpportunityScore(o: Opportunity): OpportunityScoreBreakdown {
  const detalii: { criteriu: string; puncte: number; maxim: number }[] = [];

  // Decident identificat (contact cu nume + functie) - 20p
  const decidentPuncte = o.contact_nume && o.contact_functie ? 20 : o.contact_nume ? 10 : 0;
  detalii.push({ criteriu: "Decident identificat", puncte: decidentPuncte, maxim: 20 });

  // Sistem actual deficitar / fara sistem - 20p (presupunem ca lipsa solutiei
  // existente sau mentionarea uneia indica o nevoie de inlocuire)
  const sistemPuncte = o.solutia_existenta ? 20 : 0;
  detalii.push({ criteriu: "Sistem actual identificat", puncte: sistemPuncte, maxim: 20 });

  // Flota / casa de expeditii (nr vehicule > 0) - 15p, scalat dupa marime
  const nrVehicule = o.nr_vehicule ?? 0;
  const flotaPuncte = nrVehicule >= 20 ? 15 : nrVehicule >= 5 ? 10 : nrVehicule > 0 ? 5 : 0;
  detalii.push({ criteriu: "Marime flota", puncte: flotaPuncte, maxim: 15 });

  // Nr utilizatori Synergo solicitati - 15p, scalat
  const nrUtilizatori = o.nr_utilizatori_synergo ?? 0;
  const utilizatoriPuncte =
    nrUtilizatori >= 20 ? 15 : nrUtilizatori >= 10 ? 10 : nrUtilizatori > 0 ? 5 : 0;
  detalii.push({ criteriu: "Nr utilizatori", puncte: utilizatoriPuncte, maxim: 15 });

  // Interes produs/proiect definit (TMS, ERP etc.) - 10p
  const interesPuncte = o.produs_serviciu_propus || o.tip_proiect ? 10 : 0;
  detalii.push({ criteriu: "Interes produs definit", puncte: interesPuncte, maxim: 10 });

  // Termen de decizie / actiune apropiata (in urmatoarele 14 zile) - 10p
  let termenPuncte = 0;
  if (o.data_actiune) {
    const zile = Math.floor(
      (new Date(o.data_actiune.slice(0, 10)).getTime() - Date.now()) / 86400000
    );
    if (zile >= 0 && zile <= 14) termenPuncte = 10;
    else if (zile > 14 && zile <= 30) termenPuncte = 5;
  }
  detalii.push({ criteriu: "Termen apropiat", puncte: termenPuncte, maxim: 10 });

  // Recomandare ca sursa - 5p
  const recomandarePuncte = o.canal_intrare === "Recomandare" ? 5 : 0;
  detalii.push({ criteriu: "Sursa recomandare", puncte: recomandarePuncte, maxim: 5 });

  // Potential fonduri europene - 5p
  const fonduriPuncte = o.potential_fonduri_europene ? 5 : 0;
  detalii.push({ criteriu: "Fonduri europene", puncte: fonduriPuncte, maxim: 5 });

  const total = detalii.reduce((s, d) => s + d.puncte, 0);
  return { total, detalii };
}

export function scoreLevel(score: number): { label: string; color: string } {
  if (score >= 70) return { label: "Ridicat", color: "#22C55E" };
  if (score >= 40) return { label: "Mediu", color: "#FBBF24" };
  return { label: "Scazut", color: "#94A3B8" };
}

export interface StagnationInfo {
  zileInStage: number;
  zileDeLaUltimaActiune: number | null;
  severitate: "ok" | "atentie" | "risc" | "critic";
}

/**
 * B-08: calculeaza zilele in stage curent si zilele de la ultima actiune
 * inregistrata, plus o severitate simpla (galben 7+, rosu 14+, critic 21+
 * zile fara actiune - cf. roadmap 5.7).
 */
export function computeStagnation(o: Opportunity): StagnationInfo {
  const now = Date.now();
  const zileInStage = Math.floor((now - new Date(o.stage_changed_at).getTime()) / 86400000);

  let zileDeLaUltimaActiune: number | null = null;
  if (o.data_actiune) {
    zileDeLaUltimaActiune = Math.floor(
      (now - new Date(o.data_actiune.slice(0, 10)).getTime()) / 86400000
    );
  }

  const referinta = zileDeLaUltimaActiune ?? zileInStage;
  let severitate: StagnationInfo["severitate"] = "ok";
  if (referinta >= 21) severitate = "critic";
  else if (referinta >= 14) severitate = "risc";
  else if (referinta >= 7) severitate = "atentie";

  return { zileInStage, zileDeLaUltimaActiune, severitate };
}

/**
 * B-11: zona operationala a Dashboard-ului - oferte (stage Ofertare) fara
 * follow-up de 7+ zile, si negocieri (stage Negociere) stagnante 7+ zile.
 * Reutilizeaza computeStagnation pentru consistenta cu badge-urile din
 * Kanban/lista.
 */
export function buildRiskLists(opportunities: Opportunity[]) {
  const activePipeline = opportunities.filter(
    (o) => o.status === "Activa" && o.stage !== "Lead Pool"
  );

  const ofertareFaraFollowUp = activePipeline
    .filter((o) => o.stage === "Ofertare")
    .filter((o) => computeStagnation(o).severitate !== "ok")
    .sort((a, b) => computeStagnation(b).zileInStage - computeStagnation(a).zileInStage);

  const negociereStagnanta = activePipeline
    .filter((o) => o.stage === "Negociere")
    .filter((o) => computeStagnation(o).severitate !== "ok")
    .sort((a, b) => computeStagnation(b).zileInStage - computeStagnation(a).zileInStage);

  const probabilitateMareFaraActiune = activePipeline
    .filter((o) => (o.probability ?? 0) >= 0.5 && (!o.actiune || !o.data_actiune));

  const amanateFaraDataRevenire = opportunities.filter(
    (o) => o.status === "Amanata" && !o.data_revenire
  );

  return {
    ofertareFaraFollowUp,
    negociereStagnanta,
    probabilitateMareFaraActiune,
    amanateFaraDataRevenire,
  };
}

export interface StageDuration {
  stage: string;
  dataIntrare: string;
  dataIesire: string | null;
  zile: number;
}

/**
 * Reconstituie din timeline (evenimentele 'creare' si 'schimbare_stage')
 * durata petrecuta in fiecare stage, in ordine cronologica. Util pentru
 * pagina de trasabilitate completa a unei oportunitati.
 */
export function computeStageDurations(timeline: TimelineEntry[]): StageDuration[] {
  // timeline vine de obicei sortat descrescator (cel mai recent primul) -
  // lucram pe o copie crescatoare, ca sa procesam in ordine cronologica reala.
  const sorted = [...timeline].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const relevant = sorted.filter((e) => e.tip === "creare" || e.tip === "schimbare_stage");
  if (relevant.length === 0) return [];

  const durations: StageDuration[] = [];
  let stageCurent: string | null = null;
  let dataIntrareCurenta: string | null = null;

  for (const entry of relevant) {
    if (entry.tip === "creare") {
      const match = entry.continut?.match(/Stage initial: (.+)$/);
      stageCurent = match?.[1] ?? null;
      dataIntrareCurenta = entry.created_at;
    } else if (entry.tip === "schimbare_stage") {
      const match = entry.continut?.match(/^(.+) -> (.+)$/);
      const stageNou = match?.[2] ?? null;
      if (stageCurent && dataIntrareCurenta) {
        const zile = Math.floor(
          (new Date(entry.created_at).getTime() - new Date(dataIntrareCurenta).getTime()) / 86400000
        );
        durations.push({
          stage: stageCurent,
          dataIntrare: dataIntrareCurenta,
          dataIesire: entry.created_at,
          zile,
        });
      }
      stageCurent = stageNou;
      dataIntrareCurenta = entry.created_at;
    }
  }

  // Stage-ul curent (fara data de iesire - inca activ)
  if (stageCurent && dataIntrareCurenta) {
    const zile = Math.floor((Date.now() - new Date(dataIntrareCurenta).getTime()) / 86400000);
    durations.push({
      stage: stageCurent,
      dataIntrare: dataIntrareCurenta,
      dataIesire: null,
      zile,
    });
  }

  return durations;
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
  const todayStr = getTodayISO();
  const today = new Date(`${todayStr}T00:00:00`);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);
  const in7DaysStr = toRomaniaISO(in7Days);

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

export type ActionCalendarStatus = "restanta" | "azi" | "viitoare" | "finalizata";

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
  responsabilActiuneId: string | null;
}

/**
 * Construieste lista de "actiuni de calendar" dintr-un set de oportunitati.
 * O oportunitate produce o actiune de calendar doar daca are data_actiune setata.
 * Status-ul (restanta/viitoare/finalizata) e derivat, nu stocat separat.
 */
export function buildCalendarActions(opportunities: Opportunity[]): CalendarAction[] {
  const todayStr = getTodayISO();

  return opportunities
    .filter((o) => !!o.data_actiune)
    .map((o) => {
      const date = o.data_actiune!.slice(0, 10);
      let status: ActionCalendarStatus;
      if (o.status_actiune === "Finalizata") {
        status = "finalizata";
      } else if (date < todayStr) {
        status = "restanta";
      } else if (date === todayStr) {
        status = "azi";
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
        responsabilActiuneId: o.responsabil_actiune_id,
      };
    });
}

/**
 * Numerele de aici TREBUIE sa corespunda exact cu ce vezi dupa ce dai click
 * pe cardul KPI si ajungi pe /actiuni?filter=... - de-asta refolosim exact
 * aceeasi logica ca buildActionWorkItems (Planificata, fereastra de 7 zile
 * pentru "viitoare"), in loc de o logica separata bazata pe CalendarAction,
 * care nu era aliniata (numaram si actiuni Finalizate, si "viitoare" nu
 * avea limita de 7 zile - de-asta pareau gresite fata de ce se vedea la
 * click).
 */
export function calendarActionCounts(opportunities: Opportunity[]) {
  const todayStr = getTodayISO();
  const today = new Date(`${todayStr}T00:00:00`);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);
  const in7DaysStr = toRomaniaISO(in7Days);

  const planificate = opportunities.filter((o) => o.data_actiune && o.status_actiune === "Planificata");

  return {
    today: planificate.filter((o) => o.data_actiune!.slice(0, 10) === todayStr).length,
    overdue: planificate.filter((o) => o.data_actiune!.slice(0, 10) < todayStr).length,
    upcoming: planificate.filter(
      (o) => o.data_actiune!.slice(0, 10) >= todayStr && o.data_actiune!.slice(0, 10) <= in7DaysStr
    ).length,
  };
}

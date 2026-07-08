"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TrendingUp, Target, Trophy, XCircle, Wrench, AlertTriangle } from "lucide-react";
import {
  computeKpis,
  groupByStage,
  groupByStatus,
  groupByResponsabil,
  buildTimeSeries,
  upcomingActions,
  applyDashboardFilters,
  buildRiskLists,
  EMPTY_FILTERS,
  type DashboardFilters,
} from "@/lib/analytics";
import { formatEur } from "@/lib/format";
import { RiskZone } from "@/components/dashboard/RiskZone";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ExpandableChart } from "@/components/ui/ExpandableChart";
import { KPI_DEFINITIONS } from "@/lib/kpi-definitions";
import { StageChart } from "@/components/dashboard/StageChart";
import { StatusChart } from "@/components/dashboard/StatusChart";
import { TimeSeriesChart } from "@/components/dashboard/TimeSeriesChart";
import { ResponsabilChart } from "@/components/dashboard/ResponsabilChart";
import { ActionsList } from "@/components/dashboard/ActionsList";
import { FilteredOpportunitiesList } from "@/components/dashboard/FilteredOpportunitiesList";
import { DashboardFilterBar } from "@/components/dashboard/DashboardFilterBar";
import { AiInsightCard } from "@/components/ui/AiInsightCard";
import { generateCrmInsightAction, getAiInsightHistoryAction } from "@/lib/actions/financial-ai";
import type { Opportunity, OpportunityHistoryRow } from "@/types/opportunity";

function toggleInArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function DashboardClient({
  opportunities,
  history,
  stageOrder,
}: {
  opportunities: Opportunity[];
  history: OpportunityHistoryRow[];
  stageOrder: string[];
}) {
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);

  const stages = useMemo(
    () => Array.from(new Set(opportunities.map((o) => o.stage))),
    [opportunities]
  );
  const statuses = useMemo(
    () => Array.from(new Set(opportunities.map((o) => o.status))),
    [opportunities]
  );
  const responsabili = useMemo(
    () =>
      Array.from(new Set(opportunities.map((o) => o.profiles?.full_name ?? "Neasignat"))).sort(),
    [opportunities]
  );
  const judete = useMemo(
    () => Array.from(new Set(opportunities.map((o) => o.judet ?? "Necunoscut"))).sort(),
    [opportunities]
  );

  const filtered = useMemo(
    () => applyDashboardFilters(opportunities, filters),
    [opportunities, filters]
  );

  const kpis = useMemo(() => computeKpis(filtered), [filtered]);
  const stageData = useMemo(() => {
    const grouped = groupByStage(filtered);
    // Sortam dupa ordinea reala de business (identica cu Kanban), nu dupa
    // ordinea de aparitie in date - altfel graficul arata stage-urile
    // intr-o ordine arbitrara, fara legatura cu fluxul comercial real.
    return [...grouped].sort(
      (a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage)
    );
  }, [filtered, stageOrder]);
  const statusData = useMemo(() => groupByStatus(filtered), [filtered]);
  const responsabilData = useMemo(() => groupByResponsabil(filtered), [filtered]);
  const timeSeries = useMemo(() => buildTimeSeries(history), [history]);
  const actions = useMemo(() => upcomingActions(filtered), [filtered]);
  const riskLists = useMemo(() => buildRiskLists(filtered), [filtered]);

  const selectedRange =
    filters.dateFrom && filters.dateTo
      ? { dateFrom: filters.dateFrom, dateTo: filters.dateTo }
      : null;

  // Daca userul a dat click pe o bara/sectiune din Stage/Status/Responsabil,
  // inlocuim widget-ul "Actiuni planificate" cu lista filtrata corespunzator
  // - mult mai util decat un grafic separat, fiindca poti vedea direct
  // oportunitatile selectate, fara sa mai navighezi in alt meniu.
  const hasChartSelection =
    filters.stages.length > 0 || filters.statuses.length > 0 || filters.responsabili.length > 0;

  const selectionLabel = (() => {
    const parts: string[] = [];
    if (filters.stages.length > 0) parts.push(filters.stages.join(", "));
    if (filters.statuses.length > 0) parts.push(filters.statuses.join(", "));
    if (filters.responsabili.length > 0) parts.push(filters.responsabili.join(", "));
    return parts.length > 0 ? `Oportunitati: ${parts.join(" · ")}` : "Oportunitati filtrate";
  })();

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-heading text-text-primary">Dashboard Comercial</h1>
          <p className="text-sm text-text-muted">
            {filtered.length} din {opportunities.length} oportunitati
            {filtered.length !== opportunities.length ? " (filtrate)" : ""}
          </p>
        </div>
        {kpis.leadPoolCount > 0 && (
          <Link
            href="/pipeline"
            className="rounded-md border border-border-subtle px-3 py-1.5 text-xs text-text-secondary transition hover:bg-surface-1"
          >
            + {kpis.leadPoolCount} in Lead Pool (exclus din forecast)
          </Link>
        )}
      </div>

      <div className="mb-4">
        <DashboardFilterBar
          filters={filters}
          onChange={setFilters}
          stages={stages}
          statuses={statuses}
          responsabili={responsabili}
          judete={judete}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <KpiCard
          label="ARR activ"
          value={formatEur(kpis.totalArr)}
          sublabel={`${kpis.activeCount} oportunitati active`}
          icon={<TrendingUp size={16} />}
          definition={KPI_DEFINITIONS.crmArrActiv}
        />
        <KpiCard
          label="Forecast ponderat"
          value={formatEur(kpis.weightedForecast)}
          sublabel="ARR x Probability"
          icon={<Target size={16} />}
          definition={KPI_DEFINITIONS.crmForecastPonderat}
        />
        <KpiCard
          label="Forecast Implementare"
          value={formatEur(kpis.forecastImplementare)}
          sublabel="Implementare x Probability"
          icon={<Wrench size={16} />}
          accent="#0070F3"
          definition={KPI_DEFINITIONS.crmForecastImplementare}
        />
        <KpiCard
          label="Castigate"
          value={String(kpis.wonCount)}
          sublabel={`Win rate: ${(kpis.winRate * 100).toFixed(0)}%`}
          icon={<Trophy size={16} />}
          accent="#22C55E"
          definition={KPI_DEFINITIONS.crmCastigate}
        />
        <KpiCard
          label="Pierdute"
          value={String(kpis.lostCount)}
          sublabel={`din ${kpis.totalOpportunities} total`}
          icon={<XCircle size={16} />}
          accent="#EF4444"
          definition={KPI_DEFINITIONS.crmPierdute}
        />
        <KpiCard
          label="Fara next step"
          value={String(kpis.faraNextStepCount)}
          sublabel="Click pentru lista completa"
          icon={<AlertTriangle size={16} />}
          accent="#F59E0B"
          href="/actiuni"
          definition={KPI_DEFINITIONS.crmFaraNextStep}
        />
      </div>

      {/* Layout compact pe 2 coloane: stanga grafice principale, dreapta zona
          operationala (risc + actiuni) - evita golurile mari cand listele
          sunt scurte, fiindca fiecare bloc isi ia doar inaltimea necesara. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ExpandableChart>
              <StageChart
                data={stageData}
                selected={filters.stages[0] ?? null}
                onSelect={(stage) =>
                  setFilters((f) => ({
                    ...f,
                    stages: stage ? toggleInArray(f.stages, stage) : [],
                  }))
                }
              />
            </ExpandableChart>
            <ExpandableChart>
              <StatusChart
                data={statusData}
                selected={filters.statuses[0] ?? null}
                onSelect={(status) =>
                  setFilters((f) => ({
                    ...f,
                    statuses: status ? toggleInArray(f.statuses, status) : [],
                  }))
                }
              />
            </ExpandableChart>
          </div>

          <ExpandableChart>
            <TimeSeriesChart
              data={timeSeries}
              selectedRange={selectedRange}
              onSelectRange={(range) =>
                setFilters((f) => ({
                  ...f,
                  dateFrom: range?.dateFrom ?? null,
                  dateTo: range?.dateTo ?? null,
                  periodPreset: range ? "custom" : null,
                }))
              }
            />
          </ExpandableChart>

          <ExpandableChart>
            <ResponsabilChart
              data={responsabilData}
              selected={filters.responsabili[0] ?? null}
              onSelect={(responsabil) =>
                setFilters((f) => ({
                  ...f,
                  responsabili: responsabil ? toggleInArray(f.responsabili, responsabil) : [],
                }))
              }
            />
          </ExpandableChart>
        </div>

        <div className="space-y-4">
          <AiInsightCard
            title="Interpretare AI (Claude)"
            generateAction={generateCrmInsightAction}
            historyAction={() => getAiInsightHistoryAction("crm_insight")}
          />
          <RiskZone
            ofertareFaraFollowUp={riskLists.ofertareFaraFollowUp}
            negociereStagnanta={riskLists.negociereStagnanta}
            probabilitateMareFaraActiune={riskLists.probabilitateMareFaraActiune}
            amanateFaraDataRevenire={riskLists.amanateFaraDataRevenire}
          />
          {hasChartSelection ? (
            <FilteredOpportunitiesList opportunities={filtered} label={selectionLabel} />
          ) : (
            <ActionsList actions={actions} />
          )}
        </div>
      </div>
    </div>
  );
}

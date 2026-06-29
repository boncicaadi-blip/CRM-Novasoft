"use client";

import { useMemo, useState } from "react";
import { TrendingUp, Target, Trophy, XCircle, Wrench, AlertTriangle } from "lucide-react";
import {
  computeKpis,
  groupByStage,
  groupByStatus,
  groupByResponsabil,
  buildTimeSeries,
  upcomingActions,
  applyDashboardFilters,
  EMPTY_FILTERS,
  type DashboardFilters,
} from "@/lib/analytics";
import { formatEur } from "@/lib/format";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { StageChart } from "@/components/dashboard/StageChart";
import { StatusChart } from "@/components/dashboard/StatusChart";
import { TimeSeriesChart } from "@/components/dashboard/TimeSeriesChart";
import { ResponsabilChart } from "@/components/dashboard/ResponsabilChart";
import { ActionsList } from "@/components/dashboard/ActionsList";
import { DashboardFilterBar } from "@/components/dashboard/DashboardFilterBar";
import type { Opportunity, OpportunityHistoryRow } from "@/types/opportunity";

export function DashboardClient({
  opportunities,
  history,
}: {
  opportunities: Opportunity[];
  history: OpportunityHistoryRow[];
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
  const stageData = useMemo(() => groupByStage(filtered), [filtered]);
  const statusData = useMemo(() => groupByStatus(filtered), [filtered]);
  const responsabilData = useMemo(() => groupByResponsabil(filtered), [filtered]);
  const timeSeries = useMemo(() => buildTimeSeries(history), [history]);
  const actions = useMemo(() => upcomingActions(filtered), [filtered]);

  const selectedRange =
    filters.dateFrom && filters.dateTo
      ? { dateFrom: filters.dateFrom, dateTo: filters.dateTo }
      : null;

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-heading text-white">Dashboard</h1>
          <p className="text-sm text-slate-500">
            {filtered.length} din {opportunities.length} oportunitati
            {filtered.length !== opportunities.length ? " (filtrate)" : ""}
          </p>
        </div>
      </div>

      <div className="mb-5">
        <DashboardFilterBar
          filters={filters}
          onChange={setFilters}
          stages={stages}
          statuses={statuses}
          responsabili={responsabili}
          judete={judete}
        />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <KpiCard
          label="ARR activ"
          value={formatEur(kpis.totalArr)}
          sublabel={`${kpis.activeCount} oportunitati active`}
          icon={<TrendingUp size={16} />}
        />
        <KpiCard
          label="Forecast ponderat"
          value={formatEur(kpis.weightedForecast)}
          sublabel="ARR x Probability"
          icon={<Target size={16} />}
        />
        <KpiCard
          label="Forecast Implementare"
          value={formatEur(kpis.forecastImplementare)}
          sublabel="Implementare x Probability"
          icon={<Wrench size={16} />}
          accent="#0070F3"
        />
        <KpiCard
          label="Castigate"
          value={String(kpis.wonCount)}
          sublabel={`Win rate: ${(kpis.winRate * 100).toFixed(0)}%`}
          icon={<Trophy size={16} />}
          accent="#22C55E"
        />
        <KpiCard
          label="Pierdute"
          value={String(kpis.lostCount)}
          sublabel={`din ${kpis.totalOpportunities} total`}
          icon={<XCircle size={16} />}
          accent="#EF4444"
        />
        <KpiCard
          label="Fara next step"
          value={String(kpis.faraNextStepCount)}
          sublabel="Click pentru lista completa"
          icon={<AlertTriangle size={16} />}
          accent="#F59E0B"
          href="/actiuni"
        />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <StageChart
            data={stageData}
            selected={filters.stage}
            onSelect={(stage) => setFilters((f) => ({ ...f, stage }))}
          />
        </div>
        <StatusChart
          data={statusData}
          selected={filters.status}
          onSelect={(status) => setFilters((f) => ({ ...f, status }))}
        />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TimeSeriesChart
            data={timeSeries}
            selectedRange={selectedRange}
            onSelectRange={(range) =>
              setFilters((f) => ({
                ...f,
                dateFrom: range?.dateFrom ?? null,
                dateTo: range?.dateTo ?? null,
              }))
            }
          />
        </div>
        <ActionsList actions={actions} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <ResponsabilChart
          data={responsabilData}
          selected={filters.responsabil}
          onSelect={(responsabil) => setFilters((f) => ({ ...f, responsabil }))}
        />
      </div>
    </div>
  );
}

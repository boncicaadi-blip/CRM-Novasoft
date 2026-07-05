"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Wallet, AlertTriangle, Target, TrendingUp } from "lucide-react";
import { KpiInfoCard } from "@/components/ui/KpiInfoCard";
import { CreantaDetailModal } from "@/components/creante/CreantaDetailModal";
import { CreanteStatusChart } from "./CreanteStatusChart";
import { CreanteTipVanzareChart } from "./CreanteTipVanzareChart";
import { CreanteAgingChart } from "./CreanteAgingChart";
import { CreanteIncasariTimeSeriesChart } from "./CreanteIncasariTimeSeriesChart";
import { CreanteTopClientiChart } from "./CreanteTopClientiChart";
import { CreanteRiscZone } from "./CreanteRiscZone";
import { CreanteGrtCard } from "./CreanteGrtCard";
import { CreanteGrtChart } from "./CreanteGrtChart";
import { CreanteDinamicaChart } from "./CreanteDinamicaChart";
import { AiInsightCard } from "@/components/ui/AiInsightCard";
import { generateCreanteInsightAction } from "@/lib/actions/financial-ai";
import { formatRon } from "@/lib/format";
import { CREANTE_KPI_DEFINITIONS } from "@/lib/creante-kpi-definitions";
import { getTodayISO } from "@/lib/date";
import {
  computeCreanteSummary,
  computeTotalIncasatInPeriod,
  getCreantaStatus,
  matchesAgingBucket,
  inPeriod,
  type AgingBucket,
  type PeriodFilter,
} from "@/lib/creante-analytics";
import {
  groupByStatusCreante,
  groupByAgingCreante,
  groupByTipVanzareCreante,
  topClientiRestanti,
  buildIncasariTimeSeries,
  buildFacturatTimeSeries,
  buildGrtSeries,
  topRiscCreante,
} from "@/lib/creante-dashboard-analytics";
import type { Creanta, CreantaIncasare } from "@/types/creante";

interface DashboardFilters {
  status: string | null;
  aging: AgingBucket | null;
  tipVanzare: string | null;
  client: string | null;
}

const EMPTY_FILTERS: DashboardFilters = { status: null, aging: null, tipVanzare: null, client: null };

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "luna_curenta", label: "Luna curenta" },
  { value: "ultimele_3_luni", label: "Ultimele 3 luni" },
  { value: "anul_curent", label: "Anul curent" },
  { value: "toate", label: "Tot istoricul" },
  { value: "custom", label: "Perioada personalizata" },
];

export function CreanteDashboardClient({
  creante,
  incasari,
  targets,
}: {
  creante: Creanta[];
  incasari: Record<string, CreantaIncasare[]>;
  targets: Record<string, number>;
}) {
  const [period, setPeriod] = useState<PeriodFilter>("toate");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Creanta | null>(null);

  const incasariFlat = useMemo(() => Object.values(incasari).flat(), [incasari]);

  const inPeriodList = useMemo(
    () => creante.filter((c) => inPeriod(c, period, { from: customFrom, to: customTo })),
    [creante, period, customFrom, customTo]
  );

  // Filtrare incrucisata - fiecare grafic reflecta selectiile din celelalte,
  // exact ca la Dashboard-ul din CRM.
  const filtered = useMemo(() => {
    return inPeriodList.filter((c) => {
      if (filters.status && getCreantaStatus(c) !== filters.status) return false;
      if (filters.tipVanzare && (c.tip_vanzare ?? "Necunoscut") !== filters.tipVanzare) return false;
      if (filters.client && c.nume_firma !== filters.client) return false;
      if (filters.aging && !matchesAgingBucket(c, filters.aging)) return false;
      return true;
    });
  }, [inPeriodList, filters]);

  const summary = useMemo(() => computeCreanteSummary(filtered), [filtered]);
  const statusData = useMemo(() => groupByStatusCreante(filtered), [filtered]);
  const agingData = useMemo(() => groupByAgingCreante(filtered), [filtered]);
  const tipVanzareData = useMemo(() => groupByTipVanzareCreante(filtered), [filtered]);
  const clientData = useMemo(() => topClientiRestanti(filtered, 8), [filtered]);
  const riscData = useMemo(() => topRiscCreante(filtered, 5), [filtered]);

  const totalIncasatInPeriod = useMemo(
    () => computeTotalIncasatInPeriod(incasariFlat, period, { from: customFrom, to: customTo }),
    [incasariFlat, period, customFrom, customTo]
  );

  // GRT si dinamica raman mereu pe ultimele 12 luni calendaristice, indiferent
  // de filtrul de perioada de mai sus - sunt inerent lunare, n-are sens sa
  // le "restrangi" la o singura luna.
  // Fereastra mai lunga decat restul graficelor (19 luni, nu 12) - acopera
  // tot istoricul de target importat (decembrie 2024 - prezent).
  const grtSeries = useMemo(() => buildGrtSeries(incasariFlat, targets, 18), [incasariFlat, targets]);
  const incasariSeries = useMemo(() => buildIncasariTimeSeries(incasariFlat, 11), [incasariFlat]);
  const facturatSeries = useMemo(() => buildFacturatTimeSeries(creante, 11), [creante]);
  const dinamicaData = useMemo(
    () =>
      facturatSeries.map((f, i) => ({
        month: f.month,
        facturat: f.facturat,
        incasat: incasariSeries[i]?.total ?? 0,
      })),
    [facturatSeries, incasariSeries]
  );

  const currentMonthKey = getTodayISO().slice(0, 7);
  const currentMonthGrt = grtSeries.find((g) => g.monthKey === currentMonthKey);

  const hasFilter = filters.status || filters.aging || filters.tipVanzare || filters.client;

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-heading text-white">Dashboard Creante</h1>
          <p className="text-sm text-slate-500">
            {filtered.length} din {creante.length} facturi
            {hasFilter ? " (filtrate)" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
            className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-white outline-none focus:border-[#E8007A]"
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value} style={{ backgroundColor: "#111535" }}>
                {p.label}
              </option>
            ))}
          </select>
          {period === "custom" && (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-white outline-none focus:border-[#E8007A]"
              />
              <span className="text-xs text-slate-500">-</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-white outline-none focus:border-[#E8007A]"
              />
            </>
          )}
          <Link
            href="/creante"
            className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-slate-400 transition hover:bg-white/5"
          >
            Vezi lista completa →
          </Link>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiInfoCard
          label="Sold total restant"
          value={formatRon(summary.totalSoldRestant)}
          sublabel={`${summary.nrFacturiRestante} facturi`}
          icon={<Wallet size={16} />}
          accent="#F59E0B"
          definition={CREANTE_KPI_DEFINITIONS.soldRestant}
        />
        <KpiInfoCard
          label="Facturi restante"
          value={String(summary.nrFacturiRestante)}
          icon={<AlertTriangle size={16} />}
          accent="#EF4444"
          definition={CREANTE_KPI_DEFINITIONS.facturiRestante}
        />
        <KpiInfoCard
          label="Target propus"
          value={formatRon(summary.targetPropus)}
          sublabel={`${summary.nrFacturiPropuse} facturi`}
          icon={<Target size={16} />}
          accent="#E8007A"
          definition={CREANTE_KPI_DEFINITIONS.targetPropus}
        />
        <KpiInfoCard
          label="Total incasat"
          value={formatRon(totalIncasatInPeriod)}
          sublabel="in perioada selectata sus"
          icon={<TrendingUp size={16} />}
          accent="#22C55E"
          definition={CREANTE_KPI_DEFINITIONS.totalIncasat}
        />
      </div>

      <div className="mb-4">
        <CreanteGrtCard
          monthKey={currentMonthKey}
          target={currentMonthGrt?.target ?? targets[currentMonthKey] ?? 0}
          realizat={currentMonthGrt?.realizat ?? 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CreanteStatusChart
              data={statusData}
              selected={filters.status}
              onSelect={(status) => setFilters((f) => ({ ...f, status: status === f.status ? null : status }))}
            />
            <CreanteTipVanzareChart
              data={tipVanzareData}
              selected={filters.tipVanzare}
              onSelect={(tip) => setFilters((f) => ({ ...f, tipVanzare: tip === f.tipVanzare ? null : tip }))}
            />
          </div>

          <CreanteAgingChart
            data={agingData}
            selected={filters.aging}
            onSelect={(bucket) => setFilters((f) => ({ ...f, aging: bucket === f.aging ? null : bucket }))}
          />

          <CreanteGrtChart data={grtSeries} />

          <CreanteDinamicaChart data={dinamicaData} />

          <CreanteIncasariTimeSeriesChart data={incasariSeries} />
        </div>

        <div className="space-y-4">
          <AiInsightCard title="Interpretare AI (Claude)" generateAction={generateCreanteInsightAction} />
          <CreanteRiscZone facturi={riscData} onSelect={setSelected} />
          <CreanteTopClientiChart
            data={clientData}
            selected={filters.client}
            onSelect={(client) => setFilters((f) => ({ ...f, client: client === f.client ? null : client }))}
          />
        </div>
      </div>

      {selected && (
        <CreantaDetailModal
          creanta={selected}
          incasari={incasari[selected.id] ?? []}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

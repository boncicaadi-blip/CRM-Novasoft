"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Wallet, AlertTriangle, Target, TrendingDown } from "lucide-react";
import { KpiInfoCard } from "@/components/ui/KpiInfoCard";
import { ObligatieDetailModal } from "@/components/obligatii/ObligatieDetailModal";
import { ObligatiiStatusChart } from "./ObligatiiStatusChart";
import { ObligatiiTipAchizitieChart } from "./ObligatiiTipAchizitieChart";
import { ObligatiiAgingChart } from "./ObligatiiAgingChart";
import { ObligatiiPlatiTimeSeriesChart } from "./ObligatiiPlatiTimeSeriesChart";
import { ObligatiiTopFurnizoriChart } from "./ObligatiiTopFurnizoriChart";
import { ObligatiiRiscZone } from "./ObligatiiRiscZone";
import { ObligatiiGrtCard } from "./ObligatiiGrtCard";
import { ObligatiiGrtChart } from "./ObligatiiGrtChart";
import { ObligatiiDinamicaChart } from "./ObligatiiDinamicaChart";
import { formatRon } from "@/lib/format";
import { OBLIGATII_KPI_DEFINITIONS } from "@/lib/obligatii-kpi-definitions";
import { getTodayISO } from "@/lib/date";
import {
  computeObligatiiSummary,
  computeTotalPlatitInPeriod,
  getObligatieStatus,
  matchesAgingBucketObligatie,
  inPeriodObligatie,
  type AgingBucketObligatie,
  type PeriodFilter,
} from "@/lib/obligatii-analytics";
import {
  groupByStatusObligatii,
  groupByAgingObligatii,
  groupByTipAchizitieObligatii,
  topFurnizoriRestanti,
  buildPlatiTimeSeries,
  buildFacturatTimeSeries,
  buildGrtSeries,
  topRiscObligatii,
} from "@/lib/obligatii-dashboard-analytics";
import type { Obligatie, ObligatiePlata } from "@/types/obligatii";

interface DashboardFilters {
  status: string | null;
  aging: AgingBucketObligatie | null;
  tipAchizitie: string | null;
  furnizor: string | null;
}

const EMPTY_FILTERS: DashboardFilters = {
  status: null,
  aging: null,
  tipAchizitie: null,
  furnizor: null,
};

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "luna_curenta", label: "Luna curenta" },
  { value: "ultimele_3_luni", label: "Ultimele 3 luni" },
  { value: "anul_curent", label: "Anul curent" },
  { value: "toate", label: "Tot istoricul" },
  { value: "custom", label: "Perioada personalizata" },
];

export function ObligatiiDashboardClient({
  obligatii,
  plati,
  targets,
}: {
  obligatii: Obligatie[];
  plati: Record<string, ObligatiePlata[]>;
  targets: Record<string, number>;
}) {
  const [period, setPeriod] = useState<PeriodFilter>("toate");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Obligatie | null>(null);

  const platiFlat = useMemo(() => Object.values(plati).flat(), [plati]);

  const inPeriodList = useMemo(
    () => obligatii.filter((o) => inPeriodObligatie(o, period, { from: customFrom, to: customTo })),
    [obligatii, period, customFrom, customTo]
  );

  const filtered = useMemo(() => {
    return inPeriodList.filter((o) => {
      if (filters.status && getObligatieStatus(o) !== filters.status) return false;
      if (filters.tipAchizitie && (o.tip_achizitie ?? "Necunoscut") !== filters.tipAchizitie) return false;
      if (filters.furnizor && o.nume_furnizor !== filters.furnizor) return false;
      if (filters.aging && !matchesAgingBucketObligatie(o, filters.aging)) return false;
      return true;
    });
  }, [inPeriodList, filters]);

  const summary = useMemo(() => computeObligatiiSummary(filtered), [filtered]);
  const statusData = useMemo(() => groupByStatusObligatii(filtered), [filtered]);
  const agingData = useMemo(() => groupByAgingObligatii(filtered), [filtered]);
  const tipAchizitieData = useMemo(() => groupByTipAchizitieObligatii(filtered), [filtered]);
  const furnizorData = useMemo(() => topFurnizoriRestanti(filtered, 8), [filtered]);
  const riscData = useMemo(() => topRiscObligatii(filtered, 5), [filtered]);

  const totalPlatitInPeriod = useMemo(
    () => computeTotalPlatitInPeriod(platiFlat, period, { from: customFrom, to: customTo }),
    [platiFlat, period, customFrom, customTo]
  );

  const grtSeries = useMemo(() => buildGrtSeries(platiFlat, targets, 11), [platiFlat, targets]);
  const platiSeries = useMemo(() => buildPlatiTimeSeries(platiFlat, 11), [platiFlat]);
  const facturatSeries = useMemo(() => buildFacturatTimeSeries(obligatii, 11), [obligatii]);
  const dinamicaData = useMemo(
    () =>
      facturatSeries.map((f, i) => ({
        month: f.month,
        facturat: f.facturat,
        platit: platiSeries[i]?.total ?? 0,
      })),
    [facturatSeries, platiSeries]
  );

  const currentMonthKey = getTodayISO().slice(0, 7);
  const currentMonthGrt = grtSeries.find((g) => g.monthKey === currentMonthKey);

  const furnizorOptions = useMemo(
    () => Array.from(new Set(obligatii.map((o) => o.nume_furnizor))).sort(),
    [obligatii]
  );
  const tipAchizitieOptions = useMemo(
    () => Array.from(new Set(obligatii.map((o) => o.tip_achizitie ?? "Necunoscut"))).sort(),
    [obligatii]
  );

  const hasFilter = filters.status || filters.aging || filters.tipAchizitie || filters.furnizor;

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-heading text-white">Dashboard Obligatii</h1>
          <p className="text-sm text-slate-500">
            {filtered.length} din {obligatii.length} facturi
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
          <select
            value={filters.furnizor ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, furnizor: e.target.value || null }))}
            className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-white outline-none focus:border-[#E8007A]"
          >
            <option value="" style={{ backgroundColor: "#111535" }}>
              Toti furnizorii
            </option>
            {furnizorOptions.map((f) => (
              <option key={f} value={f} style={{ backgroundColor: "#111535" }}>
                {f}
              </option>
            ))}
          </select>
          <select
            value={filters.tipAchizitie ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, tipAchizitie: e.target.value || null }))}
            className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-white outline-none focus:border-[#E8007A]"
          >
            <option value="" style={{ backgroundColor: "#111535" }}>
              Toate tipurile
            </option>
            {tipAchizitieOptions.map((t) => (
              <option key={t} value={t} style={{ backgroundColor: "#111535" }}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={filters.status ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || null }))}
            className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-white outline-none focus:border-[#E8007A]"
          >
            <option value="" style={{ backgroundColor: "#111535" }}>
              Toate statusurile
            </option>
            <option value="restanta" style={{ backgroundColor: "#111535" }}>
              Restanta
            </option>
            <option value="la_zi" style={{ backgroundColor: "#111535" }}>
              La zi
            </option>
            <option value="platita" style={{ backgroundColor: "#111535" }}>
              Platita
            </option>
          </select>
          {hasFilter && (
            <button
              onClick={() => setFilters(EMPTY_FILTERS)}
              className="text-xs text-[#E8007A] hover:text-[#FF4FAA]"
            >
              Sterge filtrele
            </button>
          )}
          <Link
            href="/obligatii"
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
          definition={OBLIGATII_KPI_DEFINITIONS.soldRestant}
        />
        <KpiInfoCard
          label="Facturi restante"
          value={String(summary.nrFacturiRestante)}
          icon={<AlertTriangle size={16} />}
          accent="#EF4444"
          definition={OBLIGATII_KPI_DEFINITIONS.facturiRestante}
        />
        <KpiInfoCard
          label="Target propus"
          value={formatRon(summary.targetPropus)}
          sublabel={`${summary.nrFacturiPropuse} facturi`}
          icon={<Target size={16} />}
          accent="#E8007A"
          definition={OBLIGATII_KPI_DEFINITIONS.targetPropus}
        />
        <KpiInfoCard
          label="Total platit"
          value={formatRon(totalPlatitInPeriod)}
          sublabel="in perioada selectata sus"
          icon={<TrendingDown size={16} />}
          accent="#22C55E"
          definition={OBLIGATII_KPI_DEFINITIONS.totalPlatit}
        />
      </div>

      <div className="mb-4">
        <ObligatiiGrtCard
          monthKey={currentMonthKey}
          target={currentMonthGrt?.target ?? targets[currentMonthKey] ?? 0}
          realizat={currentMonthGrt?.realizat ?? 0}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ObligatiiStatusChart
              data={statusData}
              selected={filters.status}
              onSelect={(status) => setFilters((f) => ({ ...f, status: status === f.status ? null : status }))}
            />
            <ObligatiiTipAchizitieChart
              data={tipAchizitieData}
              selected={filters.tipAchizitie}
              onSelect={(tip) => setFilters((f) => ({ ...f, tipAchizitie: tip === f.tipAchizitie ? null : tip }))}
            />
          </div>

          <ObligatiiAgingChart
            data={agingData}
            selected={filters.aging}
            onSelect={(bucket) => setFilters((f) => ({ ...f, aging: bucket === f.aging ? null : bucket }))}
          />

          <ObligatiiGrtChart data={grtSeries} />

          <ObligatiiDinamicaChart data={dinamicaData} />

          <ObligatiiPlatiTimeSeriesChart data={platiSeries} />
        </div>

        <div className="space-y-4">
          <ObligatiiRiscZone facturi={riscData} onSelect={setSelected} />
          <ObligatiiTopFurnizoriChart
            data={furnizorData}
            selected={filters.furnizor}
            onSelect={(furnizor) => setFilters((f) => ({ ...f, furnizor: furnizor === f.furnizor ? null : furnizor }))}
          />
        </div>
      </div>

      {selected && (
        <ObligatieDetailModal
          obligatie={selected}
          plati={plati[selected.id] ?? []}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

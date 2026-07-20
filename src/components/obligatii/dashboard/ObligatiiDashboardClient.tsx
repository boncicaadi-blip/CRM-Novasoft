"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Wallet, AlertTriangle, Target, TrendingDown } from "lucide-react";
import { KpiInfoCard } from "@/components/ui/KpiInfoCard";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { MonthMultiSelect } from "@/components/ui/MonthMultiSelect";
import { ExpandableChart } from "@/components/ui/ExpandableChart";
import { AiInsightCard } from "@/components/ui/AiInsightCard";
import { generateObligatiiInsightAction, getAiInsightHistoryAction } from "@/lib/actions/financial-ai";
import { ObligatieDetailModal } from "@/components/obligatii/ObligatieDetailModal";
import { ObligatiiStatusChart } from "./ObligatiiStatusChart";
import { ObligatiiTipAchizitieChart } from "./ObligatiiTipAchizitieChart";
import { ObligatiiAgingChart } from "./ObligatiiAgingChart";
import { ObligatiiPlatiTimeSeriesChart } from "./ObligatiiPlatiTimeSeriesChart";
import { ObligatiiTopFurnizoriChart } from "./ObligatiiTopFurnizoriChart";
import { ObligatiiRiscZone } from "./ObligatiiRiscZone";
import { ObligatiiComponentaList } from "./ObligatiiComponentaList";
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
  status: string[];
  aging: AgingBucketObligatie[];
  tipAchizitie: string[];
  furnizor: string[];
}

const EMPTY_FILTERS: DashboardFilters = {
  status: [],
  aging: [],
  tipAchizitie: [],
  furnizor: [],
};

function toggleIn<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

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
  modalitatePlataOptions,
}: {
  obligatii: Obligatie[];
  plati: Record<string, ObligatiePlata[]>;
  targets: Record<string, number>;
  modalitatePlataOptions: string[];
}) {
  const [period, setPeriod] = useState<PeriodFilter>("toate");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customMonths, setCustomMonths] = useState<string[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Obligatie | null>(null);

  const platiFlat = useMemo(() => Object.values(plati).flat(), [plati]);

  const inPeriodList = useMemo(
    () => obligatii.filter((o) => inPeriodObligatie(o, period, { from: customFrom, to: customTo, months: customMonths })),
    [obligatii, period, customFrom, customTo, customMonths]
  );

  const filtered = useMemo(() => {
    return inPeriodList.filter((o) => {
      if (filters.status.length > 0 && !filters.status.includes(getObligatieStatus(o))) return false;
      if (filters.tipAchizitie.length > 0 && !filters.tipAchizitie.includes(o.tip_achizitie ?? "Necunoscut")) return false;
      if (filters.furnizor.length > 0 && !filters.furnizor.includes(o.nume_furnizor)) return false;
      if (filters.aging.length > 0 && !filters.aging.some((b) => matchesAgingBucketObligatie(o, b))) return false;
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
    () => computeTotalPlatitInPeriod(platiFlat, period, { from: customFrom, to: customTo, months: customMonths }),
    [platiFlat, period, customFrom, customTo, customMonths]
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

  const hasFilter =
    filters.status.length > 0 || filters.aging.length > 0 || filters.tipAchizitie.length > 0 || filters.furnizor.length > 0;

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-heading text-text-primary">Dashboard Obligatii</h1>
          <p className="text-sm text-text-muted">
            {filtered.length} din {obligatii.length} facturi
            {hasFilter ? " (filtrate)" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => {
              const next = e.target.value as PeriodFilter;
              setPeriod(next);
              if (next === "custom" && (!customFrom || !customTo)) {
                const now = new Date();
                const start = new Date(now.getFullYear(), now.getMonth(), 1);
                const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                setCustomFrom(start.toISOString().slice(0, 10));
                setCustomTo(end.toISOString().slice(0, 10));
              }
            }}
            className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text-primary outline-none focus:border-[#E8007A]"
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.value} value={p.value} style={{ backgroundColor: "var(--surface-1)" }}>
                {p.label}
              </option>
            ))}
          </select>
          {period === "custom" && (
            <>
              <MonthMultiSelect selected={customMonths} onChange={setCustomMonths} />
              <span className="text-[10px] text-text-faint">sau interval:</span>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-xs text-text-primary outline-none focus:border-[#E8007A]"
              />
              <span className="text-xs text-text-muted">-</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-xs text-text-primary outline-none focus:border-[#E8007A]"
              />
            </>
          )}
          <MultiSelect
            label="Furnizori"
            options={furnizorOptions}
            selected={filters.furnizor}
            onChange={(furnizor) => setFilters((f) => ({ ...f, furnizor }))}
          />
          <MultiSelect
            label="Tip achizitie"
            options={tipAchizitieOptions}
            selected={filters.tipAchizitie}
            onChange={(tipAchizitie) => setFilters((f) => ({ ...f, tipAchizitie }))}
          />
          <MultiSelect
            label="Status"
            options={["restanta", "la_zi", "platita"]}
            selected={filters.status}
            onChange={(status) => setFilters((f) => ({ ...f, status }))}
          />
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
            className="rounded-md border border-border-subtle px-3 py-1.5 text-xs text-text-secondary transition hover:bg-surface-1"
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
        <ExpandableChart>
          <ObligatiiGrtCard
            monthKey={currentMonthKey}
            target={currentMonthGrt?.target ?? targets[currentMonthKey] ?? 0}
            realizat={currentMonthGrt?.realizat ?? 0}
          />
        </ExpandableChart>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ExpandableChart>
              <ObligatiiStatusChart
                data={statusData}
                selected={filters.status}
                onToggle={(status) => setFilters((f) => ({ ...f, status: toggleIn(f.status, status) }))}
              />
            </ExpandableChart>
            <ExpandableChart>
              <ObligatiiTipAchizitieChart
                data={tipAchizitieData}
                selected={filters.tipAchizitie}
                onToggle={(tip) => setFilters((f) => ({ ...f, tipAchizitie: toggleIn(f.tipAchizitie, tip) }))}
              />
            </ExpandableChart>
          </div>

          <ExpandableChart>
            <ObligatiiAgingChart
              data={agingData}
              selected={filters.aging}
              onToggle={(bucket) => setFilters((f) => ({ ...f, aging: toggleIn(f.aging, bucket) }))}
            />
          </ExpandableChart>

          <ExpandableChart>
            <ObligatiiGrtChart data={grtSeries} />
          </ExpandableChart>

          <ExpandableChart>
            <ObligatiiDinamicaChart data={dinamicaData} />
          </ExpandableChart>

          <ExpandableChart>
            <ObligatiiPlatiTimeSeriesChart data={platiSeries} />
          </ExpandableChart>
        </div>

        <div className="space-y-4">
          <AiInsightCard
            title="Interpretare AI (Claude)"
            generateAction={generateObligatiiInsightAction}
            historyAction={() => getAiInsightHistoryAction("obligatii_insight")}
          />
          <ObligatiiRiscZone facturi={riscData} onSelect={setSelected} />
          <ExpandableChart>
            <ObligatiiTopFurnizoriChart
              data={furnizorData}
              selected={filters.furnizor}
              onToggle={(furnizor) => setFilters((f) => ({ ...f, furnizor: toggleIn(f.furnizor, furnizor) }))}
            />
          </ExpandableChart>
          {hasFilter && <ObligatiiComponentaList facturi={filtered} onSelect={setSelected} />}
        </div>
      </div>

      {selected && (
        <ObligatieDetailModal
          obligatie={selected}
          plati={plati[selected.id] ?? []}
          modalitatePlataOptions={modalitatePlataOptions}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

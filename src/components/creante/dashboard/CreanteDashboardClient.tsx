"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Wallet, AlertTriangle, Target, TrendingUp } from "lucide-react";
import { KpiInfoCard } from "@/components/ui/KpiInfoCard";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { MonthMultiSelect } from "@/components/ui/MonthMultiSelect";
import { ExpandableChart } from "@/components/ui/ExpandableChart";
import { CreantaDetailModal } from "@/components/creante/CreantaDetailModal";
import { CreanteStatusChart } from "./CreanteStatusChart";
import { CreanteTipVanzareChart } from "./CreanteTipVanzareChart";
import { CreanteAgingChart } from "./CreanteAgingChart";
import { CreanteIncasariTimeSeriesChart } from "./CreanteIncasariTimeSeriesChart";
import { CreanteZiuaLuniiChart } from "./CreanteZiuaLuniiChart";
import { CreanteTopClientiChart } from "./CreanteTopClientiChart";
import { CreanteRiscZone } from "./CreanteRiscZone";
import { CreanteComponentaList } from "./CreanteComponentaList";
import { CreanteGrtCard } from "./CreanteGrtCard";
import { CreanteGrtChart } from "./CreanteGrtChart";
import { CreanteDinamicaChart } from "./CreanteDinamicaChart";
import { AiInsightCard } from "@/components/ui/AiInsightCard";
import { generateCreanteInsightAction, getAiInsightHistoryAction } from "@/lib/actions/financial-ai";
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
  groupByZiuaLunii,
} from "@/lib/creante-dashboard-analytics";
import type { Creanta, CreantaIncasare } from "@/types/creante";

interface DashboardFilters {
  status: string[];
  aging: AgingBucket[];
  tipVanzare: string[];
  client: string[];
}

const EMPTY_FILTERS: DashboardFilters = { status: [], aging: [], tipVanzare: [], client: [] };

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
  const [customMonths, setCustomMonths] = useState<string[]>([]);
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Creanta | null>(null);

  const incasariFlat = useMemo(() => Object.values(incasari).flat(), [incasari]);

  const inPeriodList = useMemo(
    () => creante.filter((c) => inPeriod(c, period, { from: customFrom, to: customTo, months: customMonths })),
    [creante, period, customFrom, customTo, customMonths]
  );

  // Filtrare incrucisata - fiecare grafic reflecta selectiile din celelalte,
  // exact ca la Dashboard-ul din CRM.
  const filtered = useMemo(() => {
    return inPeriodList.filter((c) => {
      if (filters.status.length > 0) {
        const matches = filters.status.some((s) => (s === "neincasate" ? c.sold > 0 : getCreantaStatus(c) === s));
        if (!matches) return false;
      }
      if (filters.tipVanzare.length > 0 && !filters.tipVanzare.includes(c.tip_vanzare ?? "Necunoscut")) return false;
      if (filters.client.length > 0 && !filters.client.includes(c.nume_firma)) return false;
      if (filters.aging.length > 0 && !filters.aging.some((b) => matchesAgingBucket(c, b))) return false;
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
    () => computeTotalIncasatInPeriod(incasariFlat, period, { from: customFrom, to: customTo, months: customMonths }),
    [incasariFlat, period, customFrom, customTo, customMonths]
  );

  // GRT si dinamica raman mereu pe ultimele 12 luni calendaristice, indiferent
  // de filtrul de perioada de mai sus - sunt inerent lunare, n-are sens sa
  // le "restrangi" la o singura luna.
  // Fereastra mai lunga decat restul graficelor (19 luni, nu 12) - acopera
  // tot istoricul de target importat (decembrie 2024 - prezent).
  const grtSeries = useMemo(() => buildGrtSeries(incasariFlat, targets, 18), [incasariFlat, targets]);
  const incasariSeries = useMemo(() => buildIncasariTimeSeries(incasariFlat, 11), [incasariFlat]);
  const ziuaLuniiData = useMemo(
    () => groupByZiuaLunii(incasariFlat, period, { from: customFrom, to: customTo, months: customMonths }),
    [incasariFlat, period, customFrom, customTo, customMonths]
  );
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

  const clientOptions = useMemo(
    () => Array.from(new Set(creante.map((c) => c.nume_firma))).sort(),
    [creante]
  );
  const tipVanzareOptions = useMemo(
    () => Array.from(new Set(creante.map((c) => c.tip_vanzare ?? "Necunoscut"))).sort(),
    [creante]
  );

  const hasFilter =
    filters.status.length > 0 || filters.aging.length > 0 || filters.tipVanzare.length > 0 || filters.client.length > 0;

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
              <MonthMultiSelect selected={customMonths} onChange={setCustomMonths} />
              <span className="text-[10px] text-slate-600">sau interval:</span>
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
          <MultiSelect
            label="Clienti"
            options={clientOptions}
            selected={filters.client}
            onChange={(client) => setFilters((f) => ({ ...f, client }))}
          />
          <MultiSelect
            label="Tip vanzare"
            options={tipVanzareOptions}
            selected={filters.tipVanzare}
            onChange={(tipVanzare) => setFilters((f) => ({ ...f, tipVanzare }))}
          />
          <MultiSelect
            label="Status"
            options={["restanta", "la_zi", "neincasate", "incasata"]}
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
            href="/creante"
            className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-slate-400 transition hover:bg-white/5"
          >
            Vezi lista completa →
          </Link>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiInfoCard
          label="Total Creante (neincasate)"
          value={formatRon(summary.totalSoldNeincasat)}
          sublabel="indiferent de scadenta"
          icon={<Wallet size={16} />}
          accent="#0070F3"
          definition={CREANTE_KPI_DEFINITIONS.totalNeincasat}
        />
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
        <ExpandableChart>
          <CreanteGrtCard
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
              <CreanteStatusChart
                data={statusData}
                selected={filters.status}
                onToggle={(status) => setFilters((f) => ({ ...f, status: toggleIn(f.status, status) }))}
              />
            </ExpandableChart>
            <ExpandableChart>
              <CreanteTipVanzareChart
                data={tipVanzareData}
                selected={filters.tipVanzare}
                onToggle={(tip) => setFilters((f) => ({ ...f, tipVanzare: toggleIn(f.tipVanzare, tip) }))}
              />
            </ExpandableChart>
          </div>

          <ExpandableChart>
            <CreanteAgingChart
              data={agingData}
              selected={filters.aging}
              onToggle={(bucket) => setFilters((f) => ({ ...f, aging: toggleIn(f.aging, bucket) }))}
            />
          </ExpandableChart>

          <ExpandableChart>
            <CreanteGrtChart data={grtSeries} />
          </ExpandableChart>

          <ExpandableChart>
            <CreanteDinamicaChart data={dinamicaData} />
          </ExpandableChart>

          <ExpandableChart>
            <CreanteIncasariTimeSeriesChart data={incasariSeries} />
          </ExpandableChart>

          <ExpandableChart>
            <CreanteZiuaLuniiChart data={ziuaLuniiData} />
          </ExpandableChart>
        </div>

        <div className="space-y-4">
          <AiInsightCard
            title="Interpretare AI (Claude)"
            generateAction={generateCreanteInsightAction}
            historyAction={() => getAiInsightHistoryAction("creante_insight")}
          />
          <CreanteRiscZone facturi={riscData} onSelect={setSelected} />
          <ExpandableChart>
            <CreanteTopClientiChart
              data={clientData}
              selected={filters.client}
              onToggle={(client) => setFilters((f) => ({ ...f, client: toggleIn(f.client, client) }))}
            />
          </ExpandableChart>
          {hasFilter && <CreanteComponentaList facturi={filtered} onSelect={setSelected} />}
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

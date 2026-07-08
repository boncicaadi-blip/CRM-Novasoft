"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TrendingDown, Target, PiggyBank } from "lucide-react";
import { formatEur } from "@/lib/format";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { MonthMultiSelect } from "@/components/ui/MonthMultiSelect";
import { ExpandableChart } from "@/components/ui/ExpandableChart";
import { AiInsightCard } from "@/components/ui/AiInsightCard";
import { generateCheltuieliInsightAction, getAiInsightHistoryAction } from "@/lib/actions/financial-ai";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { CHELTUIELI_KPI_DEFINITIONS } from "@/lib/cheltuieli-kpi-definitions";
import {
  groupByIncadrare,
  groupByClasa,
  groupByFrecventa,
  groupByStatusContract,
  buildEvolutieLunara,
} from "@/lib/cheltuieli-dashboard-analytics";
import { VenituriEvolutieChart } from "@/components/venituri/dashboard/VenituriEvolutieChart";
import { VenituriPieChart } from "@/components/venituri/dashboard/VenituriPieChart";
import { CheltuieliComponentaList } from "./CheltuieliComponentaList";
import { TopClasaList } from "./TopClasaList";
import type { ContractCheltuiala, CheltuialaLinie } from "@/types/cheltuieli";

type PeriodFilter = "luna_curenta" | "ultimele_3_luni" | "anul_curent" | "toate" | "custom";

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "luna_curenta", label: "Luna curenta" },
  { value: "ultimele_3_luni", label: "Ultimele 3 luni" },
  { value: "anul_curent", label: "Anul curent" },
  { value: "toate", label: "Tot istoricul" },
  { value: "custom", label: "Perioada personalizata" },
];

function inPeriod(
  luna: string,
  period: PeriodFilter,
  customFrom = "",
  customTo = "",
  customMonths: string[] = []
): boolean {
  if (period === "toate") return true;
  const d = new Date(luna);
  const now = new Date();
  if (period === "custom") {
    if (customMonths.length > 0) return customMonths.includes(luna.slice(0, 7));
    if (customFrom && d < new Date(customFrom)) return false;
    if (customTo && d > new Date(customTo)) return false;
    return true;
  }
  if (period === "luna_curenta") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  if (period === "anul_curent") return d.getFullYear() === now.getFullYear();
  if (period === "ultimele_3_luni") {
    const threshold = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const sfarsitLunaCurenta = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return d >= threshold && d <= sfarsitLunaCurenta;
  }
  return true;
}

interface Filters {
  incadrare: string[];
  clasa: string[];
  frecventa: string[];
}

const EMPTY_FILTERS: Filters = { incadrare: [], clasa: [], frecventa: [] };

function toggleIn(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function CheltuieliDashboardClient({
  cheltuieliLinii,
  contracte,
}: {
  cheltuieliLinii: CheltuialaLinie[];
  contracte: ContractCheltuiala[];
}) {
  const [period, setPeriod] = useState<PeriodFilter>("anul_curent");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customMonths, setCustomMonths] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showComponenta, setShowComponenta] = useState(false);

  const contractById = useMemo(() => new Map(contracte.map((c) => [c.id, c])), [contracte]);

  const incadrareOptions = useMemo(
    () => Array.from(new Set(cheltuieliLinii.map((l) => l.incadrare))).sort(),
    [cheltuieliLinii]
  );
  const clasaOptions = useMemo(
    () => Array.from(new Set(cheltuieliLinii.map((l) => l.clasa))).sort(),
    [cheltuieliLinii]
  );

  const inPeriodList = useMemo(
    () => cheltuieliLinii.filter((l) => inPeriod(l.luna, period, customFrom, customTo, customMonths)),
    [cheltuieliLinii, period, customFrom, customTo, customMonths]
  );

  function matchesFilters(l: CheltuialaLinie): boolean {
    if (filters.incadrare.length > 0 && !filters.incadrare.includes(l.incadrare)) return false;
    if (filters.clasa.length > 0 && !filters.clasa.includes(l.clasa)) return false;
    if (filters.frecventa.length > 0 && !filters.frecventa.includes(l.frecventa)) return false;
    return true;
  }

  const filtered = useMemo(() => inPeriodList.filter(matchesFilters), [inPeriodList, filters]);

  const summary = useMemo(() => {
    const acum = new Date();
    const lunaCurentaKey = `${acum.getFullYear()}-${String(acum.getMonth() + 1).padStart(2, "0")}`;
    let prognozat = 0;
    let realizat = 0;
    let prognozatPanaAcum = 0;
    for (const l of filtered) {
      prognozat += l.valoare_prognozata;
      realizat += l.valoare_realizata ?? 0;
      if (l.luna.slice(0, 7) <= lunaCurentaKey) prognozatPanaAcum += l.valoare_prognozata;
    }
    const diferenta = realizat - prognozatPanaAcum;
    const grt = prognozatPanaAcum > 0 ? (realizat / prognozatPanaAcum) * 100 : null;
    return { prognozat, realizat, prognozatPanaAcum, diferenta, grt };
  }, [filtered]);

  const incadrareData = useMemo(() => groupByIncadrare(filtered), [filtered]);
  const clasaData = useMemo(() => groupByClasa(filtered), [filtered]);
  const frecventaData = useMemo(() => groupByFrecventa(filtered), [filtered]);
  const statusData = useMemo(() => groupByStatusContract(filtered, contractById), [filtered, contractById]);
  const evolutieData = useMemo(
    () => buildEvolutieLunara(cheltuieliLinii.filter(matchesFilters), 18),
    [cheltuieliLinii, filters]
  );

  const hasFilter = filters.incadrare.length > 0 || filters.clasa.length > 0 || filters.frecventa.length > 0;

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-heading text-text-primary">Dashboard Cheltuieli</h1>
          <p className="text-sm text-text-muted">
            {filtered.length} din {inPeriodList.length} linii{hasFilter ? " (filtrate)" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            label="Incadrare"
            options={incadrareOptions}
            selected={filters.incadrare}
            onChange={(incadrare) => setFilters((f) => ({ ...f, incadrare }))}
          />
          <MultiSelect
            label="Clasa"
            options={clasaOptions}
            selected={filters.clasa}
            onChange={(clasa) => setFilters((f) => ({ ...f, clasa }))}
          />
          <MultiSelect
            label="Frecventa"
            options={["Recurenta", "Nerecurenta"]}
            selected={filters.frecventa}
            onChange={(frecventa) => setFilters((f) => ({ ...f, frecventa }))}
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
            href="/venituri-cheltuieli/cheltuieli"
            className="rounded-md border border-border-subtle px-3 py-1.5 text-xs text-text-secondary transition hover:bg-surface-1"
          >
            Vezi lista completa →
          </Link>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => setShowComponenta((v) => !v)}
          className={`rounded-xl border p-4 text-left transition hover:border-border-strong ${showComponenta ? "border-[#E8007A]/40 bg-[#E8007A]/[0.03]" : "border-border-subtle bg-surface-1"}`}
        >
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            <PiggyBank size={13} />
            Prognozat (tot ce e in perioada)
            <InfoTooltip title="Prognozat" definition={CHELTUIELI_KPI_DEFINITIONS.prognozat} />
          </p>
          <p className="font-mono text-2xl font-medium text-text-primary">{formatEur(summary.prognozat)}</p>
        </button>
        <button
          onClick={() => setShowComponenta((v) => !v)}
          className={`rounded-xl border p-4 text-left transition hover:border-border-strong ${showComponenta ? "border-[#E8007A]/40 bg-[#E8007A]/[0.03]" : "border-border-subtle bg-surface-1"}`}
        >
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            <TrendingDown size={13} />
            Realizat
            <InfoTooltip title="Realizat" definition={CHELTUIELI_KPI_DEFINITIONS.realizat} />
          </p>
          <p className="font-mono text-2xl font-medium text-text-primary">{formatEur(summary.realizat)}</p>
        </button>
        <button
          onClick={() => setShowComponenta((v) => !v)}
          className={`rounded-xl border p-4 text-left transition hover:border-border-strong ${showComponenta ? "border-[#E8007A]/40 bg-[#E8007A]/[0.03]" : "border-border-subtle bg-surface-1"}`}
        >
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            Diferenta (pana in luna curenta)
            <InfoTooltip title="Diferenta (YTD)" definition={CHELTUIELI_KPI_DEFINITIONS.diferentaYtd} />
          </p>
          <p className={`font-mono text-2xl font-medium ${summary.diferenta <= 0 ? "text-green-400" : "text-red-400"}`}>
            {summary.diferenta >= 0 ? "+" : ""}
            {formatEur(summary.diferenta)}
          </p>
          <p className="mt-0.5 text-[10px] text-text-faint">
            Fata de prognozat {formatEur(summary.prognozatPanaAcum)} — nu include lunile viitoare
          </p>
        </button>
        <button
          onClick={() => setShowComponenta((v) => !v)}
          className={`rounded-xl border p-4 text-left transition hover:border-border-strong ${showComponenta ? "border-[#E8007A]/40 bg-[#E8007A]/[0.03]" : "border-border-subtle bg-surface-1"}`}
        >
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            <Target size={13} />
            Grad realizare (pana acum)
          </p>
          <p className="font-mono text-2xl font-medium text-text-primary">
            {summary.grt !== null ? `${Math.round(summary.grt)}%` : "—"}
          </p>
        </button>
      </div>
      <p className="-mt-2 mb-4 text-[11px] text-text-faint">Click pe orice KPI de mai sus arata din ce e compus.</p>

      <div className="mb-4">
        <AiInsightCard
          title="Interpretare AI (Claude)"
          generateAction={generateCheltuieliInsightAction}
          historyAction={() => getAiInsightHistoryAction("cheltuieli_insight")}
        />
      </div>

      <ExpandableChart>
        <VenituriEvolutieChart data={evolutieData} />
      </ExpandableChart>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ExpandableChart>
          <VenituriPieChart
            title="Dupa Incadrare"
            data={incadrareData}
            selected={filters.incadrare}
            onToggle={(v) => setFilters((f) => ({ ...f, incadrare: toggleIn(f.incadrare, v) }))}
            definition={CHELTUIELI_KPI_DEFINITIONS.dupaIncadrare}
          />
        </ExpandableChart>
        <ExpandableChart>
          <TopClasaList
            title="Dupa Clasa"
            data={clasaData}
            selected={filters.clasa}
            onToggle={(v) => setFilters((f) => ({ ...f, clasa: toggleIn(f.clasa, v) }))}
            definition={CHELTUIELI_KPI_DEFINITIONS.dupaClasa}
          />
        </ExpandableChart>
        <ExpandableChart>
          <VenituriPieChart
            title="Recurenta vs. Nerecurenta"
            data={frecventaData}
            selected={filters.frecventa}
            onToggle={(v) => setFilters((f) => ({ ...f, frecventa: toggleIn(f.frecventa, v) }))}
            definition={CHELTUIELI_KPI_DEFINITIONS.fixeVsVariabile}
          />
        </ExpandableChart>
        <ExpandableChart>
          <VenituriPieChart
            title="Dupa Status Contract"
            data={statusData.map((s) => ({ cheie: s.status, count: s.count, estimat: s.valoare, realizat: s.valoare }))}
            definition={CHELTUIELI_KPI_DEFINITIONS.dupaStatusContract}
          />
        </ExpandableChart>
      </div>

      {(hasFilter || showComponenta) && (
        <div className="mt-4">
          <CheltuieliComponentaList linii={filtered} />
        </div>
      )}
    </div>
  );
}

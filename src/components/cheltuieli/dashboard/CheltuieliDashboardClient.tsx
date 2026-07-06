"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TrendingDown, Target, PiggyBank } from "lucide-react";
import { formatEur } from "@/lib/format";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
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

type PeriodFilter = "luna_curenta" | "ultimele_3_luni" | "anul_curent" | "toate";

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "luna_curenta", label: "Luna curenta" },
  { value: "ultimele_3_luni", label: "Ultimele 3 luni" },
  { value: "anul_curent", label: "Anul curent" },
  { value: "toate", label: "Tot istoricul" },
];

function inPeriod(luna: string, period: PeriodFilter): boolean {
  if (period === "toate") return true;
  const d = new Date(luna);
  const now = new Date();
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
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const contractById = useMemo(() => new Map(contracte.map((c) => [c.id, c])), [contracte]);

  const incadrareOptions = useMemo(
    () => Array.from(new Set(cheltuieliLinii.map((l) => l.incadrare))).sort(),
    [cheltuieliLinii]
  );
  const clasaOptions = useMemo(
    () => Array.from(new Set(cheltuieliLinii.map((l) => l.clasa))).sort(),
    [cheltuieliLinii]
  );

  const inPeriodList = useMemo(() => cheltuieliLinii.filter((l) => inPeriod(l.luna, period)), [cheltuieliLinii, period]);

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
          <h1 className="text-lg font-heading text-white">Dashboard Cheltuieli</h1>
          <p className="text-sm text-slate-500">
            {filtered.length} din {inPeriodList.length} linii{hasFilter ? " (filtrate)" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-slate-400 transition hover:bg-white/5"
          >
            Vezi lista completa →
          </Link>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <PiggyBank size={13} />
            Prognozat (tot ce e in perioada)
            <InfoTooltip title="Prognozat" definition={CHELTUIELI_KPI_DEFINITIONS.prognozat} />
          </p>
          <p className="font-mono text-2xl font-medium text-white">{formatEur(summary.prognozat)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <TrendingDown size={13} />
            Realizat
            <InfoTooltip title="Realizat" definition={CHELTUIELI_KPI_DEFINITIONS.realizat} />
          </p>
          <p className="font-mono text-2xl font-medium text-white">{formatEur(summary.realizat)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            Diferenta (pana in luna curenta)
            <InfoTooltip title="Diferenta (YTD)" definition={CHELTUIELI_KPI_DEFINITIONS.diferentaYtd} />
          </p>
          <p className={`font-mono text-2xl font-medium ${summary.diferenta <= 0 ? "text-green-400" : "text-red-400"}`}>
            {summary.diferenta >= 0 ? "+" : ""}
            {formatEur(summary.diferenta)}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-600">
            Fata de prognozat {formatEur(summary.prognozatPanaAcum)} — nu include lunile viitoare
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Target size={13} />
            Grad realizare (pana acum)
          </p>
          <p className="font-mono text-2xl font-medium text-white">
            {summary.grt !== null ? `${Math.round(summary.grt)}%` : "—"}
          </p>
        </div>
      </div>

      <VenituriEvolutieChart data={evolutieData} />

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <VenituriPieChart
          title="Dupa Incadrare"
          data={incadrareData}
          selected={filters.incadrare}
          onToggle={(v) => setFilters((f) => ({ ...f, incadrare: toggleIn(f.incadrare, v) }))}
          definition={CHELTUIELI_KPI_DEFINITIONS.dupaIncadrare}
        />
        <TopClasaList
          title="Dupa Clasa"
          data={clasaData}
          selected={filters.clasa}
          onToggle={(v) => setFilters((f) => ({ ...f, clasa: toggleIn(f.clasa, v) }))}
          definition={CHELTUIELI_KPI_DEFINITIONS.dupaClasa}
        />
        <VenituriPieChart
          title="Recurenta vs. Nerecurenta"
          data={frecventaData}
          selected={filters.frecventa}
          onToggle={(v) => setFilters((f) => ({ ...f, frecventa: toggleIn(f.frecventa, v) }))}
          definition={CHELTUIELI_KPI_DEFINITIONS.fixeVsVariabile}
        />
        <VenituriPieChart
          title="Dupa Status Contract"
          data={statusData.map((s) => ({ cheie: s.status, count: s.count, estimat: s.valoare, realizat: s.valoare }))}
          definition={CHELTUIELI_KPI_DEFINITIONS.dupaStatusContract}
        />
      </div>

      {hasFilter && (
        <div className="mt-4">
          <CheltuieliComponentaList linii={filtered} />
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TrendingUp, Target, PiggyBank } from "lucide-react";
import { formatEur } from "@/lib/format";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { MultiSelect } from "@/components/ui/MultiSelect";
import { VENITURI_KPI_DEFINITIONS } from "@/lib/venituri-kpi-definitions";
import {
  groupBy,
  groupByProdus,
  groupByServiciu,
  groupByTipVenit,
  groupByStatusContract,
  topClienti,
  buildEvolutieLunara,
} from "@/lib/venituri-dashboard-analytics";
import { VenituriEvolutieChart } from "./VenituriEvolutieChart";
import { VenituriPieChart } from "./VenituriPieChart";
import { VenituriTopClientiChart } from "./VenituriTopClientiChart";
import { VenituriComponentaList } from "./VenituriComponentaList";
import { AiInsightCard } from "@/components/ui/AiInsightCard";
import { generateVenituriInsightAction, getAiInsightHistoryAction } from "@/lib/actions/financial-ai";
import type { Contract, VenitLinie } from "@/types/venituri";
import type { PartnerGrupInfo } from "@/lib/data/venituri";

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
  produs: string[];
  serviciu: string[];
  tipVenit: string[];
  client: string[];
  grup: string[];
}

const EMPTY_FILTERS: Filters = { produs: [], serviciu: [], tipVenit: [], client: [], grup: [] };

function toggleIn(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

export function VenituriDashboardClient({
  venituriLinii,
  contracte,
  partnersGrup,
}: {
  venituriLinii: VenitLinie[];
  contracte: Contract[];
  partnersGrup: PartnerGrupInfo[];
}) {
  const [period, setPeriod] = useState<PeriodFilter>("anul_curent");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const contractById = useMemo(() => new Map(contracte.map((c) => [c.id, c])), [contracte]);
  const grupByPartnerId = useMemo(
    () => new Map(partnersGrup.map((p) => [p.id, p.nume_grup])),
    [partnersGrup]
  );
  const grupOf = (l: VenitLinie): string | null =>
    l.partner_id ? (grupByPartnerId.get(l.partner_id) ?? null) : null;

  const clientOptions = useMemo(
    () => Array.from(new Set(venituriLinii.map((l) => l.nume_client))).sort(),
    [venituriLinii]
  );
  const produsOptions = useMemo(
    () => Array.from(new Set(venituriLinii.map((l) => l.produs).filter((v): v is string => !!v))).sort(),
    [venituriLinii]
  );
  const serviciuOptions = useMemo(
    () => Array.from(new Set(venituriLinii.map((l) => l.serviciu).filter((v): v is string => !!v))).sort(),
    [venituriLinii]
  );
  const grupOptions = useMemo(
    () => Array.from(new Set(partnersGrup.map((p) => p.nume_grup).filter((v): v is string => !!v))).sort(),
    [partnersGrup]
  );

  const inPeriodList = useMemo(() => venituriLinii.filter((l) => inPeriod(l.luna, period)), [venituriLinii, period]);

  function matchesFilters(l: VenitLinie): boolean {
    if (filters.produs.length > 0 && !filters.produs.includes(l.produs ?? "")) return false;
    if (filters.serviciu.length > 0 && !filters.serviciu.includes(l.serviciu ?? "")) return false;
    if (filters.tipVenit.length > 0 && !filters.tipVenit.includes(l.tip_venit)) return false;
    if (filters.client.length > 0 && !filters.client.includes(l.nume_client)) return false;
    if (filters.grup.length > 0 && !filters.grup.includes(grupOf(l) ?? "")) return false;
    return true;
  }

  const filtered = useMemo(() => inPeriodList.filter(matchesFilters), [inPeriodList, filters, grupByPartnerId]);

  const summary = useMemo(() => {
    const acum = new Date();
    const lunaCurentaKey = `${acum.getFullYear()}-${String(acum.getMonth() + 1).padStart(2, "0")}`;

    let estimat = 0;
    let realizat = 0;
    let estimatPanaAcum = 0;
    for (const l of filtered) {
      estimat += l.venit_estimat;
      realizat += l.venit_realizat ?? 0;
      if (l.luna.slice(0, 7) <= lunaCurentaKey) estimatPanaAcum += l.venit_estimat;
    }
    const diferenta = realizat - estimatPanaAcum;
    const grt = estimatPanaAcum > 0 ? (realizat / estimatPanaAcum) * 100 : null;
    return { estimat, realizat, estimatPanaAcum, diferenta, grt };
  }, [filtered]);

  const produsData = useMemo(() => groupByProdus(filtered), [filtered]);
  const serviciuData = useMemo(() => groupByServiciu(filtered), [filtered]);
  const tipVenitData = useMemo(() => groupByTipVenit(filtered), [filtered]);
  const statusData = useMemo(() => groupByStatusContract(filtered, contractById), [filtered, contractById]);
  const grupData = useMemo(() => groupBy(filtered, (l) => grupOf(l)), [filtered, grupByPartnerId]);
  const topClientiData = useMemo(() => topClienti(filtered, 10), [filtered]);

  const evolutieData = useMemo(
    () => buildEvolutieLunara(venituriLinii.filter(matchesFilters), 18),
    [venituriLinii, filters, grupByPartnerId]
  );

  const hasFilter =
    filters.produs.length > 0 ||
    filters.serviciu.length > 0 ||
    filters.tipVenit.length > 0 ||
    filters.client.length > 0 ||
    filters.grup.length > 0;

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-heading text-white">Dashboard Venituri</h1>
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
            label="Clienti"
            options={clientOptions}
            selected={filters.client}
            onChange={(client) => setFilters((f) => ({ ...f, client }))}
          />
          <MultiSelect
            label="Grup"
            options={grupOptions}
            selected={filters.grup}
            onChange={(grup) => setFilters((f) => ({ ...f, grup }))}
          />
          <MultiSelect
            label="Produs"
            options={produsOptions}
            selected={filters.produs}
            onChange={(produs) => setFilters((f) => ({ ...f, produs }))}
          />
          <MultiSelect
            label="Serviciu"
            options={serviciuOptions}
            selected={filters.serviciu}
            onChange={(serviciu) => setFilters((f) => ({ ...f, serviciu }))}
          />
          <MultiSelect
            label="Tip venit"
            options={["Recurent", "Nerecurent"]}
            selected={filters.tipVenit}
            onChange={(tipVenit) => setFilters((f) => ({ ...f, tipVenit }))}
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
            href="/venituri-cheltuieli"
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
            Venit estimat (tot ce e in perioada)
            <InfoTooltip title="Venit estimat" definition={VENITURI_KPI_DEFINITIONS.venitEstimat} />
          </p>
          <p className="font-mono text-2xl font-medium text-white">{formatEur(summary.estimat)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <TrendingUp size={13} />
            Venit realizat
            <InfoTooltip title="Venit realizat" definition={VENITURI_KPI_DEFINITIONS.venitRealizat} />
          </p>
          <p className="font-mono text-2xl font-medium text-white">{formatEur(summary.realizat)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            Diferenta (pana in luna curenta)
            <InfoTooltip title="Diferenta (YTD)" definition={VENITURI_KPI_DEFINITIONS.diferentaYtd} />
          </p>
          <p className={`font-mono text-2xl font-medium ${summary.diferenta >= 0 ? "text-green-400" : "text-red-400"}`}>
            {summary.diferenta >= 0 ? "+" : ""}
            {formatEur(summary.diferenta)}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-600">
            Fata de estimat {formatEur(summary.estimatPanaAcum)} — nu include lunile viitoare
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Target size={13} />
            Grad realizare (pana acum)
            <InfoTooltip title="Grad realizare" definition={VENITURI_KPI_DEFINITIONS.gradRealizare} />
          </p>
          <p className="font-mono text-2xl font-medium text-white">
            {summary.grt !== null ? `${Math.round(summary.grt)}%` : "—"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <VenituriEvolutieChart data={evolutieData} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <VenituriTopClientiChart
              title="Dupa Produs"
              data={produsData}
              selected={filters.produs}
              onToggle={(v) => setFilters((f) => ({ ...f, produs: toggleIn(f.produs, v) }))}
              definition={VENITURI_KPI_DEFINITIONS.dupaProdus}
            />
            <VenituriTopClientiChart
              title="Dupa Serviciu"
              data={serviciuData}
              selected={filters.serviciu}
              onToggle={(v) => setFilters((f) => ({ ...f, serviciu: toggleIn(f.serviciu, v) }))}
              definition={VENITURI_KPI_DEFINITIONS.dupaServiciu}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <VenituriPieChart
              title="Recurent vs. Nerecurent"
              data={tipVenitData}
              selected={filters.tipVenit}
              onToggle={(v) => setFilters((f) => ({ ...f, tipVenit: toggleIn(f.tipVenit, v) }))}
              definition={VENITURI_KPI_DEFINITIONS.recurentVsNerecurent}
            />
            <VenituriPieChart
              title="Dupa Status Contract"
              data={statusData.map((s) => ({ cheie: s.status, count: s.count, estimat: s.valoare, realizat: s.valoare }))}
              definition={VENITURI_KPI_DEFINITIONS.dupaStatusContract}
            />
          </div>

          <VenituriTopClientiChart
            title="Dupa Grup"
            data={grupData}
            selected={filters.grup}
            onToggle={(v) => setFilters((f) => ({ ...f, grup: toggleIn(f.grup, v) }))}
            definition={VENITURI_KPI_DEFINITIONS.dupaGrup}
          />

          {hasFilter && <VenituriComponentaList linii={filtered} />}
        </div>

        <div className="space-y-4">
          <AiInsightCard
            title="Interpretare AI (Claude)"
            generateAction={generateVenituriInsightAction}
            historyAction={() => getAiInsightHistoryAction("venituri_insight")}
          />
          <VenituriTopClientiChart
            title="Top clienti dupa venit realizat"
            data={topClientiData}
            selected={filters.client}
            onToggle={(v) => setFilters((f) => ({ ...f, client: toggleIn(f.client, v) }))}
            definition={VENITURI_KPI_DEFINITIONS.topClienti}
          />
        </div>
      </div>
    </div>
  );
}

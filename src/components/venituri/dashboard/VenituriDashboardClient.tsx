"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TrendingUp, Target, PiggyBank } from "lucide-react";
import { formatEur } from "@/lib/format";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { VENITURI_KPI_DEFINITIONS } from "@/lib/venituri-kpi-definitions";
import {
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
import { AiInsightCard } from "@/components/ui/AiInsightCard";
import { generateVenituriInsightAction, getAiInsightHistoryAction } from "@/lib/actions/financial-ai";
import type { Contract, VenitLinie } from "@/types/venituri";

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
  produs: string | null;
  serviciu: string | null;
  tipVenit: string | null;
  client: string | null;
}

const EMPTY_FILTERS: Filters = { produs: null, serviciu: null, tipVenit: null, client: null };

export function VenituriDashboardClient({
  venituriLinii,
  contracte,
}: {
  venituriLinii: VenitLinie[];
  contracte: Contract[];
}) {
  const [period, setPeriod] = useState<PeriodFilter>("anul_curent");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);

  const contractById = useMemo(() => new Map(contracte.map((c) => [c.id, c])), [contracte]);

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

  const inPeriodList = useMemo(() => venituriLinii.filter((l) => inPeriod(l.luna, period)), [venituriLinii, period]);

  const filtered = useMemo(
    () =>
      inPeriodList.filter(
        (l) =>
          (!filters.produs || l.produs === filters.produs) &&
          (!filters.serviciu || l.serviciu === filters.serviciu) &&
          (!filters.tipVenit || l.tip_venit === filters.tipVenit) &&
          (!filters.client || l.nume_client === filters.client)
      ),
    [inPeriodList, filters]
  );

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
    // Diferenta si Gradul de realizare se calculeaza fata de bugetul PANA
    // ACUM (luna curenta inclusiv), nu fata de tot anul - altfel lunile
    // viitoare, inca negeneralizate ca realizat, ar arata o diferenta
    // negativa falsa, desi acele luni inca nu s-au intamplat.
    const diferenta = realizat - estimatPanaAcum;
    const grt = estimatPanaAcum > 0 ? (realizat / estimatPanaAcum) * 100 : null;
    return { estimat, realizat, estimatPanaAcum, diferenta, grt };
  }, [filtered]);

  const produsData = useMemo(() => groupByProdus(filtered), [filtered]);
  const serviciuData = useMemo(() => groupByServiciu(filtered), [filtered]);
  const tipVenitData = useMemo(() => groupByTipVenit(filtered), [filtered]);
  const statusData = useMemo(() => groupByStatusContract(filtered, contractById), [filtered, contractById]);
  const topClientiData = useMemo(() => topClienti(filtered, 10), [filtered]);
  // Evolutia lunara ramane pe tot istoricul disponibil (nu pe perioada filtrata sus),
  // ca sa vezi mereu traiectoria completa, indiferent ce ai selectat pentru KPI-uri.
  const evolutieData = useMemo(
    () =>
      buildEvolutieLunara(
        venituriLinii.filter(
          (l) =>
            (!filters.produs || l.produs === filters.produs) &&
            (!filters.serviciu || l.serviciu === filters.serviciu) &&
            (!filters.tipVenit || l.tip_venit === filters.tipVenit) &&
            (!filters.client || l.nume_client === filters.client)
        ),
        18
      ),
    [venituriLinii, filters]
  );

  const hasFilter = filters.produs || filters.serviciu || filters.tipVenit || filters.client;

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-heading text-white">Dashboard Venituri</h1>
          <p className="text-sm text-slate-500">
            {filtered.length} din {inPeriodList.length} linii{hasFilter ? " (filtrate)" : ""}
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
          <select
            value={filters.client ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, client: e.target.value || null }))}
            className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-white outline-none focus:border-[#E8007A]"
          >
            <option value="" style={{ backgroundColor: "#111535" }}>
              Toti clientii
            </option>
            {clientOptions.map((c) => (
              <option key={c} value={c} style={{ backgroundColor: "#111535" }}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={filters.produs ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, produs: e.target.value || null }))}
            className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-white outline-none focus:border-[#E8007A]"
          >
            <option value="" style={{ backgroundColor: "#111535" }}>
              Toate produsele
            </option>
            {produsOptions.map((p) => (
              <option key={p} value={p} style={{ backgroundColor: "#111535" }}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={filters.serviciu ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, serviciu: e.target.value || null }))}
            className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-white outline-none focus:border-[#E8007A]"
          >
            <option value="" style={{ backgroundColor: "#111535" }}>
              Toate serviciile
            </option>
            {serviciuOptions.map((s) => (
              <option key={s} value={s} style={{ backgroundColor: "#111535" }}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={filters.tipVenit ?? ""}
            onChange={(e) => setFilters((f) => ({ ...f, tipVenit: e.target.value || null }))}
            className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-white outline-none focus:border-[#E8007A]"
          >
            <option value="" style={{ backgroundColor: "#111535" }}>
              Recurent + Nerecurent
            </option>
            <option value="Recurent" style={{ backgroundColor: "#111535" }}>
              Recurent
            </option>
            <option value="Nerecurent" style={{ backgroundColor: "#111535" }}>
              Nerecurent
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <VenituriPieChart
              title="Dupa Produs"
              data={produsData}
              selected={filters.produs}
              onSelect={(v) => setFilters((f) => ({ ...f, produs: v === f.produs ? null : v }))}
              definition={VENITURI_KPI_DEFINITIONS.dupaProdus}
            />
            <VenituriPieChart
              title="Dupa Serviciu"
              data={serviciuData}
              selected={filters.serviciu}
              onSelect={(v) => setFilters((f) => ({ ...f, serviciu: v === f.serviciu ? null : v }))}
              definition={VENITURI_KPI_DEFINITIONS.dupaServiciu}
            />
            <VenituriPieChart
              title="Recurent vs. Nerecurent"
              data={tipVenitData}
              selected={filters.tipVenit}
              onSelect={(v) => setFilters((f) => ({ ...f, tipVenit: v === f.tipVenit ? null : v }))}
              definition={VENITURI_KPI_DEFINITIONS.recurentVsNerecurent}
            />
          </div>

          <VenituriPieChart
            title="Dupa Status Contract"
            data={statusData.map((s) => ({ cheie: s.status, count: s.count, estimat: s.valoare, realizat: s.valoare }))}
            definition={VENITURI_KPI_DEFINITIONS.dupaStatusContract}
          />
        </div>

        <div className="space-y-4">
          <AiInsightCard
            title="Interpretare AI (Claude)"
            generateAction={generateVenituriInsightAction}
            historyAction={() => getAiInsightHistoryAction("venituri_insight")}
          />
          <VenituriTopClientiChart
            data={topClientiData}
            selected={filters.client}
            onSelect={(v) => setFilters((f) => ({ ...f, client: v === f.client ? null : v }))}
          />
        </div>
      </div>
    </div>
  );
}

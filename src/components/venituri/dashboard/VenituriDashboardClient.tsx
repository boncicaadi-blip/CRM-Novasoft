"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { TrendingUp, Target, PiggyBank } from "lucide-react";
import { formatEur } from "@/lib/format";
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
    return d >= threshold;
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
    let estimat = 0;
    let realizat = 0;
    for (const l of filtered) {
      estimat += l.venit_estimat;
      realizat += l.venit_realizat ?? 0;
    }
    const grt = estimat > 0 ? (realizat / estimat) * 100 : null;
    return { estimat, realizat, diferenta: realizat - estimat, grt };
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
            Venit estimat
          </p>
          <p className="font-mono text-2xl font-medium text-white">{formatEur(summary.estimat)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <TrendingUp size={13} />
            Venit realizat
          </p>
          <p className="font-mono text-2xl font-medium text-white">{formatEur(summary.realizat)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs text-slate-500">Diferenta</p>
          <p className={`font-mono text-2xl font-medium ${summary.diferenta >= 0 ? "text-green-400" : "text-red-400"}`}>
            {summary.diferenta >= 0 ? "+" : ""}
            {formatEur(summary.diferenta)}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Target size={13} />
            Grad realizare
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
            />
            <VenituriPieChart
              title="Dupa Serviciu"
              data={serviciuData}
              selected={filters.serviciu}
              onSelect={(v) => setFilters((f) => ({ ...f, serviciu: v === f.serviciu ? null : v }))}
            />
            <VenituriPieChart
              title="Recurent vs. Nerecurent"
              data={tipVenitData}
              selected={filters.tipVenit}
              onSelect={(v) => setFilters((f) => ({ ...f, tipVenit: v === f.tipVenit ? null : v }))}
            />
          </div>

          <VenituriPieChart title="Dupa Status Contract" data={statusData.map((s) => ({ cheie: s.status, count: s.count, estimat: s.valoare, realizat: s.valoare }))} />
        </div>

        <div className="space-y-4">
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

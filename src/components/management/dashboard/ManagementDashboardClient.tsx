"use client";

import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Wallet, Target } from "lucide-react";
import { formatEur } from "@/lib/format";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { MANAGEMENT_KPI_DEFINITIONS } from "@/lib/management-kpi-definitions";
import { buildManagementMonthly, computeManagementSummary } from "@/lib/management-analytics";
import { VenituriEvolutieChart } from "@/components/venituri/dashboard/VenituriEvolutieChart";
import { ManagementLineChart } from "./ManagementLineChart";
import { ManagementComponentaList } from "./ManagementComponentaList";
import type { VenitLinie } from "@/types/venituri";
import type { CheltuialaLinie } from "@/types/cheltuieli";
import type { AngajatiLunarRow } from "@/lib/data/angajati";

type PeriodFilter = "luna_curenta" | "ultimele_3_luni" | "anul_curent" | "toate" | "custom";

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "luna_curenta", label: "Luna curenta" },
  { value: "ultimele_3_luni", label: "Ultimele 3 luni" },
  { value: "anul_curent", label: "Anul curent" },
  { value: "toate", label: "Tot istoricul" },
  { value: "custom", label: "Perioada personalizata" },
];

function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function ManagementDashboardClient({
  venituriLinii,
  cheltuieliLinii,
  angajati,
}: {
  venituriLinii: VenitLinie[];
  cheltuieliLinii: CheltuialaLinie[];
  angajati: AngajatiLunarRow[];
}) {
  const [period, setPeriod] = useState<PeriodFilter>("anul_curent");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [showComponenta, setShowComponenta] = useState(false);

  const angajatiLookup = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of angajati) map.set(`${a.an}-${String(a.luna).padStart(2, "0")}`, a.nr_angajati);
    return map;
  }, [angajati]);

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (period === "luna_curenta") {
      const start = firstOfMonth(now);
      return { from: start, to: start };
    }
    if (period === "ultimele_3_luni") {
      return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to: firstOfMonth(now) };
    }
    if (period === "anul_curent") {
      return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 1) };
    }
    if (period === "custom" && customFrom && customTo) {
      return { from: firstOfMonth(new Date(customFrom)), to: firstOfMonth(new Date(customTo)) };
    }
    // "toate" (sau custom incomplet) - de la prima luna cu date, pana la ultima.
    const toateLunile = [
      ...venituriLinii.map((l) => l.luna),
      ...cheltuieliLinii.map((l) => l.luna),
    ].sort();
    if (toateLunile.length === 0) return { from: firstOfMonth(now), to: firstOfMonth(now) };
    return { from: firstOfMonth(new Date(toateLunile[0])), to: firstOfMonth(new Date(toateLunile[toateLunile.length - 1])) };
  }, [period, customFrom, customTo, venituriLinii, cheltuieliLinii]);

  const monthly = useMemo(
    () => buildManagementMonthly(venituriLinii, cheltuieliLinii, angajatiLookup, from, to),
    [venituriLinii, cheltuieliLinii, angajatiLookup, from, to]
  );

  const summary = useMemo(() => computeManagementSummary(monthly), [monthly]);

  const profitChartData = monthly.map((m) => ({
    luna: m.luna,
    label: m.label,
    estimat: m.venitEstimat - m.cheltuieliEstimat,
    realizat: m.venitRealizat - m.cheltuieliRealizat,
  }));
  const venitChartData = monthly.map((m) => ({
    luna: m.luna,
    label: m.label,
    estimat: m.venitEstimat,
    realizat: m.venitRealizat,
  }));
  const cheltuieliChartData = monthly.map((m) => ({
    luna: m.luna,
    label: m.label,
    estimat: m.cheltuieliEstimat,
    realizat: m.cheltuieliRealizat,
  }));
  const productivitateData = monthly.map((m) => ({
    label: m.label,
    value: m.nrAngajati ? m.venitRealizat / m.nrAngajati : null,
  }));
  const costPerAngajatData = monthly.map((m) => ({
    label: m.label,
    value: m.nrAngajati ? m.cheltuieliRealizat / m.nrAngajati : null,
  }));
  const ponderesRecurentData = monthly.map((m) => ({
    label: m.label,
    value: m.venitRealizat > 0 ? (m.venitRecurentRealizat / m.venitRealizat) * 100 : null,
  }));

  const diferentaEstimatVsRealizatProfit = summary.profitRealizat - summary.profitEstimat;

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-heading text-white">Management — P&amp;L simplificat</h1>
          <p className="text-sm text-slate-500">Venituri, cheltuieli, profit si productivitate, combinate.</p>
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
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          onClick={() => setShowComponenta((v) => !v)}
          className={`rounded-xl border p-4 text-left transition hover:border-white/20 ${showComponenta ? "border-[#E8007A]/40 bg-[#E8007A]/[0.03]" : "border-white/10 bg-white/[0.02]"}`}
        >
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <TrendingUp size={13} />
            Venit realizat
            <InfoTooltip title="Venit realizat" definition={MANAGEMENT_KPI_DEFINITIONS.venitRealizat} />
          </p>
          <p className="font-mono text-2xl font-medium text-white">{formatEur(summary.venitRealizat)}</p>
          <p className="mt-0.5 text-[10px] text-slate-600">Estimat: {formatEur(summary.venitEstimat)}</p>
        </button>
        <button
          onClick={() => setShowComponenta((v) => !v)}
          className={`rounded-xl border p-4 text-left transition hover:border-white/20 ${showComponenta ? "border-[#E8007A]/40 bg-[#E8007A]/[0.03]" : "border-white/10 bg-white/[0.02]"}`}
        >
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <TrendingDown size={13} />
            Cheltuieli realizate
            <InfoTooltip title="Cheltuieli realizate" definition={MANAGEMENT_KPI_DEFINITIONS.cheltuieliRealizate} />
          </p>
          <p className="font-mono text-2xl font-medium text-white">{formatEur(summary.cheltuieliRealizat)}</p>
          <p className="mt-0.5 text-[10px] text-slate-600">Estimat: {formatEur(summary.cheltuieliEstimat)}</p>
        </button>
        <button
          onClick={() => setShowComponenta((v) => !v)}
          className={`rounded-xl border p-4 text-left transition hover:border-white/20 ${showComponenta ? "border-[#E8007A]/40 bg-[#E8007A]/[0.03]" : "border-white/10 bg-white/[0.02]"}`}
        >
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Wallet size={13} />
            Profit NET
            <InfoTooltip title="Profit NET" definition={MANAGEMENT_KPI_DEFINITIONS.profitNet} />
          </p>
          <p className={`font-mono text-2xl font-medium ${summary.profitRealizat >= 0 ? "text-green-400" : "text-red-400"}`}>
            {formatEur(summary.profitRealizat)}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-600">
            Estimat: {formatEur(summary.profitEstimat)} ({diferentaEstimatVsRealizatProfit >= 0 ? "+" : ""}
            {formatEur(diferentaEstimatVsRealizatProfit)})
          </p>
        </button>
        <button
          onClick={() => setShowComponenta((v) => !v)}
          className={`rounded-xl border p-4 text-left transition hover:border-white/20 ${showComponenta ? "border-[#E8007A]/40 bg-[#E8007A]/[0.03]" : "border-white/10 bg-white/[0.02]"}`}
        >
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Target size={13} />
            Profit BRUT
            <InfoTooltip title="Profit BRUT" definition={MANAGEMENT_KPI_DEFINITIONS.profitBrut} />
          </p>
          <p className={`font-mono text-2xl font-medium ${summary.profitRealizat >= 0 ? "text-green-400" : "text-red-400"}`}>
            {formatEur(summary.profitRealizat)}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-600">Identic cu Profit NET (simplificat)</p>
        </button>
      </div>
      <p className="-mt-2 mb-4 text-[11px] text-slate-600">Click pe orice KPI de mai sus arata compozitia pe luni.</p>
      {showComponenta && (
        <div className="mb-4">
          <ManagementComponentaList months={monthly} />
        </div>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <VenituriEvolutieChart
          title="Evolutie Venit (Estimat vs. Realizat)"
          data={venitChartData}
          color="#22C55E"
          gradientId="mgmtVenit"
        />
        <VenituriEvolutieChart
          title="Evolutie Cheltuieli (Estimat vs. Realizat)"
          data={cheltuieliChartData}
          color="#F97316"
          gradientId="mgmtCheltuieli"
        />
      </div>

      <div className="mb-4">
        <VenituriEvolutieChart
          title="Evolutie Profit (Estimat vs. Realizat)"
          data={profitChartData}
          color="#A855F7"
          gradientId="mgmtProfit"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ManagementLineChart
          title="Productivitate angajat (Venit/Angajat)"
          data={productivitateData}
          formatValue={formatEur}
          color="#22C55E"
          definition={MANAGEMENT_KPI_DEFINITIONS.productivitateAngajat}
        />
        <ManagementLineChart
          title="Cost per angajat"
          data={costPerAngajatData}
          formatValue={formatEur}
          color="#F97316"
          definition={MANAGEMENT_KPI_DEFINITIONS.costPerAngajat}
        />
        <ManagementLineChart
          title="Pondere venit recurent"
          data={ponderesRecurentData}
          formatValue={(v) => `${Math.round(v)}%`}
          color="#0070F3"
          definition={MANAGEMENT_KPI_DEFINITIONS.ponderesVenitRecurent}
        />
      </div>

      {angajati.length === 0 && (
        <p className="mt-4 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">
          Nu ai completat inca numarul de angajati - productivitatea si costul per angajat vor ramane
          goale pana completezi din Setari → Angajati.
        </p>
      )}
    </div>
  );
}

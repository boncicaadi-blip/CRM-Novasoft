"use client";

import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Wallet, Target } from "lucide-react";
import { formatEur } from "@/lib/format";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { MANAGEMENT_KPI_DEFINITIONS } from "@/lib/management-kpi-definitions";
import { buildManagementMonthly, computeManagementSummary } from "@/lib/management-analytics";
import { VenituriEvolutieChart } from "@/components/venituri/dashboard/VenituriEvolutieChart";
import { ManagementLineChart } from "./ManagementLineChart";
import type { VenitLinie } from "@/types/venituri";
import type { CheltuialaLinie } from "@/types/cheltuieli";
import type { AngajatiLunarRow } from "@/lib/data/angajati";

export function ManagementDashboardClient({
  venituriLinii,
  cheltuieliLinii,
  angajati,
}: {
  venituriLinii: VenitLinie[];
  cheltuieliLinii: CheltuialaLinie[];
  angajati: AngajatiLunarRow[];
}) {
  const [luni, setLuni] = useState(12);

  const angajatiLookup = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of angajati) map.set(`${a.an}-${String(a.luna).padStart(2, "0")}`, a.nr_angajati);
    return map;
  }, [angajati]);

  const monthly = useMemo(
    () => buildManagementMonthly(venituriLinii, cheltuieliLinii, angajatiLookup, luni),
    [venituriLinii, cheltuieliLinii, angajatiLookup, luni]
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
        <select
          value={luni}
          onChange={(e) => setLuni(Number(e.target.value))}
          className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-white outline-none focus:border-[#E8007A]"
        >
          <option value={6} style={{ backgroundColor: "#111535" }}>Ultimele 6 luni</option>
          <option value={12} style={{ backgroundColor: "#111535" }}>Ultimele 12 luni</option>
          <option value={24} style={{ backgroundColor: "#111535" }}>Ultimele 24 luni</option>
        </select>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <TrendingUp size={13} />
            Venit realizat
            <InfoTooltip title="Venit realizat" definition={MANAGEMENT_KPI_DEFINITIONS.venitRealizat} />
          </p>
          <p className="font-mono text-2xl font-medium text-white">{formatEur(summary.venitRealizat)}</p>
          <p className="mt-0.5 text-[10px] text-slate-600">Estimat: {formatEur(summary.venitEstimat)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <TrendingDown size={13} />
            Cheltuieli realizate
            <InfoTooltip title="Cheltuieli realizate" definition={MANAGEMENT_KPI_DEFINITIONS.cheltuieliRealizate} />
          </p>
          <p className="font-mono text-2xl font-medium text-white">{formatEur(summary.cheltuieliRealizat)}</p>
          <p className="mt-0.5 text-[10px] text-slate-600">Estimat: {formatEur(summary.cheltuieliEstimat)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
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
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Target size={13} />
            Profit BRUT
            <InfoTooltip title="Profit BRUT" definition={MANAGEMENT_KPI_DEFINITIONS.profitBrut} />
          </p>
          <p className={`font-mono text-2xl font-medium ${summary.profitRealizat >= 0 ? "text-green-400" : "text-red-400"}`}>
            {formatEur(summary.profitRealizat)}
          </p>
          <p className="mt-0.5 text-[10px] text-slate-600">Identic cu Profit NET (simplificat)</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <VenituriEvolutieChart data={venitChartData} />
        <VenituriEvolutieChart data={cheltuieliChartData} />
      </div>

      <div className="mb-4">
        <VenituriEvolutieChart data={profitChartData} />
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

"use client";

import { TrendingUp, Target, Trophy, Layers, Sparkles } from "lucide-react";
import { KpiInfoCard } from "@/components/ui/KpiInfoCard";
import { ExpandableChart } from "@/components/ui/ExpandableChart";
import { ManagementLineChart } from "@/components/management/dashboard/ManagementLineChart";
import { RaportLunarCastigatChart, type CastigatVsTargetDatum } from "./RaportLunarCastigatChart";
import { KPI_DEFINITIONS } from "@/lib/kpi-definitions";
import { formatEur, formatEurCompact } from "@/lib/format";
import type { RaportLunarRow } from "@/lib/data/reports";

function monthLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("ro-RO", { month: "short", year: "2-digit" });
}

export function RaportLunarClient({ rows }: { rows: RaportLunarRow[] }) {
  const totalCastigat = rows.reduce((sum, r) => sum + r.castigatTotal, 0);
  const totalTarget = rows.reduce((sum, r) => sum + (r.targetLunar ?? 0), 0);
  const nrLuniCuTarget = rows.filter((r) => r.targetLunar !== null).length;
  const rataAtingere = totalTarget > 0 ? totalCastigat / totalTarget : null;

  const totalCastigate = rows.reduce((sum, r) => sum + r.nrCastigate, 0);
  const totalPierdute = rows.reduce((sum, r) => sum + r.nrPierdute, 0);
  const rataCastigMedie =
    totalCastigate + totalPierdute > 0 ? totalCastigate / (totalCastigate + totalPierdute) : null;

  const totalOportunitatiNoi = rows.reduce((sum, r) => sum + r.nrOportunitatiNoi, 0);

  const pipelineData = rows.map((r) => ({ label: monthLabel(r.lunaStart), value: r.pipelineTotalActiv }));
  const forecastData = rows.map((r) => ({ label: monthLabel(r.lunaStart), value: r.forecastTotal }));
  const oportunitatiNoiData = rows.map((r) => ({ label: monthLabel(r.lunaStart), value: r.nrOportunitatiNoi }));
  const rataCastigData = rows.map((r) => ({
    label: monthLabel(r.lunaStart),
    value: r.nrCastigate + r.nrPierdute > 0 ? (r.nrCastigate / (r.nrCastigate + r.nrPierdute)) * 100 : null,
  }));

  const castigatVsTargetData: CastigatVsTargetDatum[] = rows.map((r) => ({
    label: monthLabel(r.lunaStart),
    castigat: r.castigatTotal,
    target: r.targetLunar,
    atingere: r.targetLunar && r.targetLunar > 0 ? (r.castigatTotal / r.targetLunar) * 100 : null,
  }));

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-6">
        <h1 className="text-lg font-heading text-text-primary">Raport comercial lunar</h1>
        <p className="text-sm text-text-muted">
          Evolutia ultimelor 12 luni calendaristice. Lunile de dinainte de existenta istoricului apar cu valori
          goale (0 sau —), nu sunt un bug — inseamna doar ca nu exista inca date de atunci.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiInfoCard
          label="Castigat (12 luni)"
          value={formatEurCompact(totalCastigat)}
          icon={<Trophy size={16} />}
          accent="#22C55E"
          definition={KPI_DEFINITIONS.raportLunarCastigatVsTarget}
        />
        <KpiInfoCard
          label="Target (12 luni)"
          value={nrLuniCuTarget > 0 ? formatEurCompact(totalTarget) : "—"}
          sublabel={nrLuniCuTarget > 0 ? `${nrLuniCuTarget} din ${rows.length} luni cu target setat` : "niciun target setat"}
          icon={<Target size={16} />}
          accent="#475569"
          definition={KPI_DEFINITIONS.raportLunarCastigatVsTarget}
          insufficientData={nrLuniCuTarget === 0}
        />
        <KpiInfoCard
          label="Rata atingere target"
          value={rataAtingere !== null ? `${Math.round(rataAtingere * 100)}%` : "—"}
          icon={<Sparkles size={16} />}
          accent="#E8007A"
          definition={KPI_DEFINITIONS.raportLunarCastigatVsTarget}
          insufficientData={rataAtingere === null}
        />
        <KpiInfoCard
          label="Rata de castig"
          value={rataCastigMedie !== null ? `${Math.round(rataCastigMedie * 100)}%` : "—"}
          sublabel={`${totalCastigate} castigate / ${totalPierdute} pierdute`}
          icon={<TrendingUp size={16} />}
          accent="#0070F3"
          definition={KPI_DEFINITIONS.raportLunarRataCastig}
          insufficientData={totalCastigate + totalPierdute === 0}
        />
        <KpiInfoCard
          label="Oportunitati noi"
          value={String(totalOportunitatiNoi)}
          sublabel="ultimele 12 luni"
          icon={<Layers size={16} />}
          accent="#0070F3"
          definition={KPI_DEFINITIONS.raportLunarOportunitatiNoi}
        />
      </div>

      <div className="mb-4">
        <ExpandableChart>
          <RaportLunarCastigatChart data={castigatVsTargetData} />
        </ExpandableChart>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ExpandableChart>
          <ManagementLineChart
            title="Evolutie Pipeline Total Activ"
            data={pipelineData}
            formatValue={formatEur}
            color="#0070F3"
            definition={KPI_DEFINITIONS.raportLunarPipelineEvolutie}
          />
        </ExpandableChart>
        <ExpandableChart>
          <ManagementLineChart
            title="Evolutie Forecast Total"
            data={forecastData}
            formatValue={formatEur}
            color="#A855F7"
            definition={KPI_DEFINITIONS.raportLunarForecastEvolutie}
          />
        </ExpandableChart>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ExpandableChart>
          <ManagementLineChart
            title="Rata de castig lunara"
            data={rataCastigData}
            formatValue={(v) => `${Math.round(v)}%`}
            color="#22C55E"
            definition={KPI_DEFINITIONS.raportLunarRataCastig}
          />
        </ExpandableChart>
        <ExpandableChart>
          <ManagementLineChart
            title="Oportunitati noi pe luna"
            data={oportunitatiNoiData}
            formatValue={(v) => String(Math.round(v))}
            color="#F97316"
            definition={KPI_DEFINITIONS.raportLunarOportunitatiNoi}
          />
        </ExpandableChart>
      </div>
    </div>
  );
}

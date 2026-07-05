"use client";

import Link from "next/link";
import {
  Layers,
  Boxes,
  Wrench,
  PieChart,
  Target,
  Gauge,
  TrendingUp,
  Trophy,
  ArrowLeftRight,
} from "lucide-react";
import { KpiInfoCard } from "@/components/ui/KpiInfoCard";
import { AiInsightCard } from "@/components/ui/AiInsightCard";
import { generateRaportComercialInsightAction } from "@/lib/actions/financial-ai";
import { KPI_DEFINITIONS } from "@/lib/kpi-definitions";
import { formatEurCompact } from "@/lib/format";
import type { PipelineReportKpis } from "@/lib/analytics";
import type { PipelineSnapshot } from "@/lib/data/reports";

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${value >= 0 ? "" : "-"}${Math.abs(Math.round(value * 100))}%`;
}

function trendFor(delta: number | null): "up" | "down" | "flat" | undefined {
  if (delta === null) return undefined;
  if (delta > 0) return "up";
  if (delta < 0) return "down";
  return "flat";
}

export function RaportComercialClient({
  current,
  previousWeek,
  targetComercial,
}: {
  current: PipelineReportKpis;
  previousWeek: PipelineSnapshot | null;
  targetComercial: number | null;
}) {
  const pipelineCoverage =
    targetComercial && targetComercial > 0 ? current.pipelineTotalActiv / targetComercial : null;

  const pipelineDelta =
    previousWeek !== null ? current.pipelineTotalActiv - previousWeek.pipelineTotalActiv : null;
  const pipelineDeltaProcent =
    pipelineDelta !== null && previousWeek && previousWeek.pipelineTotalActiv > 0
      ? pipelineDelta / previousWeek.pipelineTotalActiv
      : null;

  const forecastDelta =
    previousWeek !== null ? current.forecastTotal - previousWeek.forecastTotal : null;
  const forecastDeltaProcent =
    forecastDelta !== null && previousWeek && previousWeek.forecastTotal > 0
      ? forecastDelta / previousWeek.forecastTotal
      : null;

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-6">
        <h1 className="text-lg font-heading text-white">Raport Comercial</h1>
        <p className="text-sm text-slate-500">
          Analiza de ansamblu a pipeline-ului: volum, calitate si dinamica. Click pe iconita info
          de pe orice card pentru definitie si cum il analizezi.
        </p>
      </div>

      <div className="mb-6">
        <AiInsightCard title="Interpretare AI (Claude)" generateAction={generateRaportComercialInsightAction} />
      </div>

      <Section title="Volum" dotColor="#0070F3" description="Cat business ai in lucru chiar acum.">
        <KpiInfoCard
          label="Pipeline Activ SaaS"
          value={formatEurCompact(current.pipelineActivSaas)}
          icon={<Layers size={16} />}
          accent="#0070F3"
          definition={KPI_DEFINITIONS.pipelineActivSaas}
        />
        <KpiInfoCard
          label="Pipeline Activ OnPrem"
          value={formatEurCompact(current.pipelineActivOnprem)}
          icon={<Boxes size={16} />}
          accent="#0070F3"
          definition={KPI_DEFINITIONS.pipelineActivOnprem}
        />
        <KpiInfoCard
          label="Pipeline Activ Implementare"
          value={formatEurCompact(current.pipelineActivImplementare)}
          icon={<Wrench size={16} />}
          accent="#0070F3"
          definition={KPI_DEFINITIONS.pipelineActivImplementare}
        />
        <KpiInfoCard
          label="Pipeline Total Activ"
          value={formatEurCompact(current.pipelineTotalActiv)}
          icon={<PieChart size={16} />}
          accent="#60A5FA"
          definition={KPI_DEFINITIONS.pipelineTotalActiv}
        />
        <KpiInfoCard
          label="Oportunitati Active"
          value={String(current.oportunitatiActive)}
          icon={<Boxes size={16} />}
          accent="#0070F3"
          definition={KPI_DEFINITIONS.oportunitatiActive}
        />
      </Section>

      <Section
        title="Calitate"
        dotColor="#22C55E"
        description="Cat din pipeline e realist sa se transforme in venit."
      >
        <KpiInfoCard
          label="Forecast Total"
          value={formatEurCompact(current.forecastTotal)}
          icon={<Target size={16} />}
          accent="#E8007A"
          definition={KPI_DEFINITIONS.forecastTotal}
        />
        <KpiInfoCard
          label="Forecast SaaS"
          value={formatEurCompact(current.forecastTotalSaas)}
          icon={<Layers size={16} />}
          accent="#0070F3"
          definition={KPI_DEFINITIONS.forecastSaas}
        />
        <KpiInfoCard
          label="Forecast OnPrem"
          value={formatEurCompact(current.forecastTotalOnpremise)}
          icon={<Boxes size={16} />}
          accent="#0070F3"
          definition={KPI_DEFINITIONS.forecastOnprem}
        />
        <KpiInfoCard
          label="Win Rate"
          value={formatPercent(current.winRate)}
          icon={<Trophy size={16} />}
          accent="#22C55E"
          definition={KPI_DEFINITIONS.winRate}
        />
      </Section>

      <Section
        title="Dinamica"
        dotColor="#F59E0B"
        description="Cum se schimba pipeline-ul de la o saptamana la alta."
      >
        <KpiInfoCard
          label="Pipeline Coverage"
          value={pipelineCoverage !== null ? pipelineCoverage.toFixed(2) : "—"}
          sublabel={
            targetComercial
              ? pipelineCoverage !== null && pipelineCoverage >= 1
                ? "Target acoperit"
                : "Pipeline insuficient fata de target"
              : undefined
          }
          icon={<Gauge size={16} />}
          accent="#F59E0B"
          definition={KPI_DEFINITIONS.pipelineCoverage}
          insufficientData={!targetComercial}
        />
        <KpiInfoCard
          label="Pipeline Delta"
          value={pipelineDelta !== null ? formatEurCompact(pipelineDelta) : "—"}
          sublabel="fata de saptamana trecuta"
          icon={<ArrowLeftRight size={16} />}
          accent="#F59E0B"
          definition={KPI_DEFINITIONS.pipelineDelta}
          trend={trendFor(pipelineDelta)}
          insufficientData={previousWeek === null}
        />
        <KpiInfoCard
          label="Pipeline Delta %"
          value={formatPercent(pipelineDeltaProcent)}
          sublabel="fata de saptamana trecuta"
          icon={<TrendingUp size={16} />}
          accent="#F59E0B"
          definition={KPI_DEFINITIONS.pipelineDeltaProcent}
          trend={trendFor(pipelineDelta)}
          insufficientData={previousWeek === null}
        />
        <KpiInfoCard
          label="Forecast Delta"
          value={forecastDelta !== null ? formatEurCompact(forecastDelta) : "—"}
          sublabel="fata de saptamana trecuta"
          icon={<ArrowLeftRight size={16} />}
          accent="#F59E0B"
          definition={KPI_DEFINITIONS.forecastDelta}
          trend={trendFor(forecastDelta)}
          insufficientData={previousWeek === null}
        />
        <KpiInfoCard
          label="Forecast Delta %"
          value={formatPercent(forecastDeltaProcent)}
          sublabel="fata de saptamana trecuta"
          icon={<TrendingUp size={16} />}
          accent="#F59E0B"
          definition={KPI_DEFINITIONS.forecastDeltaProcent}
          trend={trendFor(forecastDelta)}
          insufficientData={previousWeek === null}
        />
      </Section>

      {!targetComercial && (
        <p className="mt-2 text-xs text-slate-500">
          Pipeline Coverage necesita un target comercial setat.{" "}
          <Link href="/setari/comercial" className="text-[#E8007A] hover:underline">
            Seteaza-l aici
          </Link>
          .
        </p>
      )}
    </div>
  );
}

function Section({
  title,
  description,
  dotColor,
  children,
}: {
  title: string;
  description: string;
  dotColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
        <h2 className="text-sm font-medium text-white">{title}</h2>
        <span className="text-xs text-slate-500">— {description}</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">{children}</div>
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, History } from "lucide-react";
import { getOpportunity, getProfiles } from "@/lib/data/opportunities";
import { getNomenclatoare } from "@/lib/data/nomenclatoare";
import { getTimeline } from "@/lib/data/timeline";
import { computeOpportunityScore, scoreLevel } from "@/lib/analytics";
import { STAGE_COLORS, STATUS_COLORS } from "@/lib/constants";
import { formatEur } from "@/lib/format";
import { DeleteButton } from "@/components/DeleteButton";
import { FirmaCard } from "@/components/overview/FirmaCard";
import { ContactCard } from "@/components/overview/ContactCard";
import { CalificareCard } from "@/components/overview/CalificareCard";
import { PipelineStatusCard } from "@/components/overview/PipelineStatusCard";
import { ActiuneCard } from "@/components/overview/ActiuneCard";
import { PricingCard } from "@/components/overview/PricingCard";
import { SursaCard } from "@/components/overview/SursaCard";
import { TimelineCard } from "@/components/overview/TimelineCard";
import type { Opportunity } from "@/types/opportunity";

function valori(items: { valoare: string }[] | undefined): string[] {
  return (items ?? []).map((i) => i.valoare);
}

export default async function OpportunityOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [o, profiles, nomenclatoare] = await Promise.all([
    getOpportunity(id),
    getProfiles(),
    getNomenclatoare(),
  ]);

  if (!o) notFound();

  const timeline = await getTimeline(id);

  const stageColor = nomenclatoare["stage"]?.find((s) => s.valoare === o.stage)?.culoare
    ?? STAGE_COLORS[o.stage]
    ?? "#94A3B8";
  const statusColor = nomenclatoare["status"]?.find((s) => s.valoare === o.status)?.culoare
    ?? STATUS_COLORS[o.status]
    ?? "#94A3B8";

  return (
    <div className="px-3 py-4 sm:px-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/pipeline"
            className="mb-1 flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300"
          >
            <ArrowLeft size={13} />
            Inapoi la pipeline
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-heading text-white">{o.nume_potential}</h1>
            <span className="font-mono text-xs text-slate-500">{o.opportunity_code}</span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: `${stageColor}20`, color: stageColor }}
            >
              {o.stage}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
            >
              {o.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{o.nume_grup}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/oportunitati/${o.id}/istoric`}
            className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/5"
          >
            <History size={14} />
            Istoric complet
          </Link>
          <DeleteButton id={o.id} />
        </div>
      </div>

      {/* KPI rapide */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-6">
        <KpiMini label="ARR" value={formatEur(o.arr_synergo)} accent="#E8007A" />
        <KpiMini label="MRR" value={formatEur(o.mrr_synergo)} />
        <KpiMini
          label="Forecast Implementare"
          value={formatEur(o.forecast_implementare)}
          accent="#0070F3"
        />
        <KpiMini
          label={o.pricing_mode === "saas" ? "Forecast SaaS" : "Forecast OnPremise"}
          value={formatEur(
            o.pricing_mode === "saas" ? o.forecast_total_saas : o.forecast_total_onpremise
          )}
          accent="#0070F3"
        />
        <KpiMini label="Probability" value={`${Math.round((o.probability ?? 0) * 100)}%`} />
        <ScoreKpi o={o} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FirmaCard o={o} profiles={profiles} domeniiActivitate={nomenclatoare["domeniu_activitate"] ?? []} />
        <ContactCard o={o} />
        <CalificareCard o={o} produseServicii={valori(nomenclatoare["produs_serviciu"])} />
        <PipelineStatusCard
          o={o}
          stages={nomenclatoare["stage"] ?? []}
          statusuri={nomenclatoare["status"] ?? []}
          motivePierdere={nomenclatoare["motiv_pierdere"] ?? []}
          motiveAmanare={nomenclatoare["motiv_amanare"] ?? []}
        />
        <ActiuneCard
          o={o}
          actiuni={valori(nomenclatoare["actiune"])}
          statusActiune={valori(nomenclatoare["status_actiune"])}
        />
        <PricingCard o={o} tipuriProiect={valori(nomenclatoare["tip_proiect"])} />
        <SursaCard o={o} canaleIntrare={valori(nomenclatoare["canal_intrare"])} />
        <TimelineCard opportunityId={o.id} entries={timeline} />
      </div>

      <p className="mt-4 text-[11px] text-slate-600">
        Ultima actualizare: {new Date(o.updated_at).toLocaleString("ro-RO")}
      </p>
    </div>
  );
}

function KpiMini({
  label,
  value,
  accent = "#94A3B8",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="font-mono text-lg" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}

function ScoreKpi({ o }: { o: Opportunity }) {
  const score = computeOpportunityScore(o);
  const level = scoreLevel(score.total);
  const tooltip = score.detalii
    .map((d) => `${d.criteriu}: ${d.puncte}/${d.maxim}`)
    .join("\n");

  return (
    <div
      className="rounded-lg border border-white/10 bg-white/[0.02] p-3"
      title={tooltip}
    >
      <p className="text-[11px] text-slate-500">Scor oportunitate</p>
      <p className="font-mono text-lg" style={{ color: level.color }}>
        {score.total}
        <span className="text-xs text-slate-500">/100</span>
      </p>
      <p className="text-[10px]" style={{ color: level.color }}>
        {level.label}
      </p>
    </div>
  );
}

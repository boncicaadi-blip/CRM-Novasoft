import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { getOpportunity } from "@/lib/data/opportunities";
import { STAGE_COLORS, STATUS_COLORS } from "@/lib/constants";
import { formatEur } from "@/lib/format";
import { DeleteButton } from "@/components/DeleteButton";
import { InfoCard, InfoRow } from "@/components/overview/InfoCard";

function fmtDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("ro-RO");
}

function yesNo(value: boolean) {
  return value ? "Da" : "Nu";
}

export default async function OpportunityOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const o = await getOpportunity(id);

  if (!o) notFound();

  return (
    <div className="px-6 py-4">
      <div className="mb-5 flex items-center justify-between">
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
              style={{
                backgroundColor: `${STAGE_COLORS[o.stage]}20`,
                color: STAGE_COLORS[o.stage],
              }}
            >
              {o.stage}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: `${STATUS_COLORS[o.status]}20`,
                color: STATUS_COLORS[o.status],
              }}
            >
              {o.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{o.nume_grup}</p>
        </div>
        <div className="flex items-center gap-2">
          <DeleteButton id={o.id} />
          <Link
            href={`/oportunitati/${o.id}/edit`}
            className="flex items-center gap-1.5 rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA]"
          >
            <Pencil size={14} />
            Editeaza
          </Link>
        </div>
      </div>

      {/* KPI rapide */}
      <div className="mb-5 grid grid-cols-4 gap-3">
        <KpiMini label="ARR" value={formatEur(o.arr_synergo)} accent="#E8007A" />
        <KpiMini label="MRR" value={formatEur(o.mrr_synergo)} />
        <KpiMini label="Forecast SaaS" value={formatEur(o.forecast_total_saas)} accent="#0070F3" />
        <KpiMini
          label="Probability"
          value={`${Math.round((o.probability ?? 0) * 100)}%`}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <InfoCard title="Firma">
          <InfoRow label="Nume grup" value={o.nume_grup} />
          <InfoRow label="Nume potential" value={o.nume_potential} />
          <InfoRow label="Cod fiscal" value={o.cod_fiscal} />
          <InfoRow label="Responsabil vanzare" value={o.profiles?.full_name} />
          <InfoRow label="Domeniu activitate" value={o.domeniul_activitate} />
          <InfoRow label="Judet" value={o.judet} />
          <InfoRow label="Oras" value={o.oras} />
        </InfoCard>

        <InfoCard title="Calificare tehnica">
          <InfoRow label="Solutia existenta" value={o.solutia_existenta} />
          <InfoRow label="Client Novasoft" value={yesNo(o.client_novasoft)} />
          <InfoRow label="Client WindSoft" value={yesNo(o.client_windsoft)} />
          <InfoRow label="Produs propus" value={o.produs_serviciu_propus} />
          <InfoRow label="Contabilitate interna" value={o.contabilitate_interna} />
          <InfoRow label="Solutie contabilitate" value={o.solutie_contabilitate} />
          <InfoRow label="Mai multe firme in grup" value={yesNo(o.mai_multe_firme_grup)} />
          <InfoRow label="Nr vehicule" value={o.nr_vehicule} />
          <InfoRow label="Interes planificator" value={yesNo(o.interes_planificator)} />
          <InfoRow label="Potential fonduri europene" value={yesNo(o.potential_fonduri_europene)} />
        </InfoCard>

        <InfoCard title="Pipeline & status">
          <InfoRow label="Data contactarii" value={fmtDate(o.data_contactarii)} />
          <InfoRow label="Stage" value={o.stage} />
          <InfoRow label="Status" value={o.status} />
          <InfoRow label="Substatus" value={o.substatus} />
          <InfoRow label="Motivatia substatusului" value={o.motivatia_substatusului} />
          <InfoRow label="Probability" value={`${Math.round((o.probability ?? 0) * 100)}%`} />
        </InfoCard>

        <InfoCard title="Actiune curenta">
          <InfoRow label="Actiune" value={o.actiune} />
          <InfoRow label="Status actiune" value={o.status_actiune} />
          <InfoRow label="Data actiune" value={fmtDate(o.data_actiune)} />
          <InfoRow label="Data finalizare" value={fmtDate(o.data_finalizare_actiune)} />
          {o.observatii_actiune && (
            <div className="py-1.5">
              <span className="text-xs text-slate-500">Observatii actiune</span>
              <p className="mt-1 text-sm text-slate-300">{o.observatii_actiune}</p>
            </div>
          )}
        </InfoCard>

        <InfoCard title="Pricing">
          <InfoRow label="Tip proiect" value={o.tip_proiect} />
          <InfoRow label="Nr utilizatori Synergo" value={o.nr_utilizatori_synergo} />
          <InfoRow label="Valoare pret / user" value={formatEur(o.valoare_pret_per_user)} />
          <InfoRow
            label="Valoare implementare"
            value={formatEur(o.valoare_implementare_synergo)}
          />
          <InfoRow label="Valoare SaaS anuala" value={formatEur(o.valoare_saas_anuala)} />
          <InfoRow label="ARR Synergo" value={formatEur(o.arr_synergo)} />
          <InfoRow label="MRR Synergo" value={formatEur(o.mrr_synergo)} />
          <InfoRow
            label="Licenta Synergo OnPremise"
            value={formatEur(o.licenta_synergo_onpremise)}
          />
          <InfoRow
            label="Mentenanta lunara OnPremise"
            value={formatEur(o.valoare_mentenanta_lunara_onpremise)}
          />
          <InfoRow label="Forecast Total SaaS" value={formatEur(o.forecast_total_saas)} />
          <InfoRow
            label="Forecast Total OnPremise"
            value={formatEur(o.forecast_total_onpremise)}
          />
        </InfoCard>

        <InfoCard title="Sursa & context">
          <InfoRow label="Canal intrare" value={o.canal_intrare} />
          <InfoRow label="Nume canal intrare" value={o.nume_canal_intrare} />
          <InfoRow label="Oportunitati" value={o.oportunitati} />
          {o.feedback && (
            <div className="py-1.5">
              <span className="text-xs text-slate-500">Feedback</span>
              <p className="mt-1 text-sm text-slate-300">{o.feedback}</p>
            </div>
          )}
          {o.observatii && (
            <div className="py-1.5">
              <span className="text-xs text-slate-500">Observatii</span>
              <p className="mt-1 text-sm text-slate-300">{o.observatii}</p>
            </div>
          )}
        </InfoCard>
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

"use client";

import Link from "next/link";
import { AlertTriangle, Flame, Clock } from "lucide-react";
import { formatEur } from "@/lib/format";
import { computeStagnation } from "@/lib/analytics";
import type { Opportunity } from "@/types/opportunity";

export function RiskZone({
  ofertareFaraFollowUp,
  negociereStagnanta,
  probabilitateMareFaraActiune,
  amanateFaraDataRevenire,
}: {
  ofertareFaraFollowUp: Opportunity[];
  negociereStagnanta: Opportunity[];
  probabilitateMareFaraActiune: Opportunity[];
  amanateFaraDataRevenire: Opportunity[];
}) {
  const hasAny =
    ofertareFaraFollowUp.length > 0 ||
    negociereStagnanta.length > 0 ||
    probabilitateMareFaraActiune.length > 0 ||
    amanateFaraDataRevenire.length > 0;

  if (!hasAny) return null;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <AlertTriangle size={16} className="text-amber-400" />
        <p className="text-sm font-medium text-white">Zona de risc</p>
      </div>

      <div className="space-y-4">
        <RiskGroup
          title="Oferte fara follow-up"
          icon={<Clock size={13} />}
          items={ofertareFaraFollowUp}
        />
        <RiskGroup
          title="Negocieri stagnante"
          icon={<Flame size={13} />}
          items={negociereStagnanta}
        />
        <RiskGroup
          title="Probabilitate mare, fara actiune"
          icon={<AlertTriangle size={13} />}
          items={probabilitateMareFaraActiune}
        />
        <RiskGroup
          title="Amanate fara data revenire"
          icon={<Clock size={13} />}
          items={amanateFaraDataRevenire}
        />
      </div>
    </div>
  );
}

function RiskGroup({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: Opportunity[];
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-amber-400">
        {icon}
        {title} ({items.length})
      </p>
      <div className="space-y-1.5">
        {items.slice(0, 4).map((o) => {
          const stagnare = computeStagnation(o);
          return (
            <Link
              key={o.id}
              href={`/oportunitati/${o.id}`}
              className="block rounded-md bg-white/[0.02] px-2 py-1.5 text-xs transition hover:bg-white/5"
            >
              <p className="truncate text-slate-200">{o.nume_potential}</p>
              <p className="text-[10px] text-slate-500">
                {stagnare.zileInStage > 0 && `${stagnare.zileInStage}z in stage · `}
                {formatEur((o.forecast_total_saas ?? 0) + (o.forecast_total_onpremise ?? 0))}
              </p>
            </Link>
          );
        })}
        {items.length > 4 && (
          <p className="px-2 text-[10px] text-slate-500">+{items.length - 4} mai multe</p>
        )}
      </div>
    </div>
  );
}

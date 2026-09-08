"use client";

import { useDroppable } from "@dnd-kit/core";
import { STAGE_COLORS } from "@/lib/constants";
import { formatEur } from "@/lib/format";
import { KanbanCard } from "./KanbanCard";
import type { Opportunity } from "@/types/opportunity";

export function KanbanColumn({
  stage,
  opportunities,
  stageColor,
}: {
  stage: string;
  opportunities: Opportunity[];
  stageColor?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const color = stageColor ?? STAGE_COLORS[stage] ?? "var(--text-secondary)";

  const totalMrr = opportunities.reduce(
    (sum, o) => sum + (o.mrr_synergo ?? 0) + (o.forecast_mentenanta_onpremise_lunar ?? 0),
    0
  );
  const totalImplementare = opportunities.reduce(
    (sum, o) => sum + (o.forecast_implementare ?? o.valoare_implementare_synergo ?? 0),
    0
  );

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full w-72 shrink-0 flex-col rounded-xl border transition ${
        isOver ? "border-[#E8007A]/50 bg-[#E8007A]/[0.03]" : "border-border-faint bg-white/[0.015]"
      }`}
    >
      <div className="border-b border-border-faint px-3 py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm font-medium text-text-primary">{stage}</span>
          </div>
          <span className="rounded-full bg-surface-2 px-1.5 text-[11px] text-text-secondary">
            {opportunities.length}
          </span>
        </div>
        {(totalMrr > 0 || totalImplementare > 0) && (
          <div className="mt-1 flex items-center gap-3 font-mono text-[11px]">
            {totalMrr > 0 && (
              <span style={{ color: "#E8007A" }} title="Total MRR">
                {formatEur(totalMrr)} MRR
              </span>
            )}
            {totalImplementare > 0 && (
              <span style={{ color: "#0070F3" }} title="Total implementare">
                {formatEur(totalImplementare)} IMPL.
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {opportunities.map((opp) => (
          <KanbanCard key={opp.id} opportunity={opp} />
        ))}
        {opportunities.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-text-faint">Nicio oportunitate</p>
        )}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, AlertTriangle, AlertCircle, Flame } from "lucide-react";
import { STATUS_COLORS } from "@/lib/constants";
import { formatEur } from "@/lib/format";
import { computeStagnation } from "@/lib/analytics";
import { ScoreBadge } from "@/components/ScoreBadge";
import type { Opportunity } from "@/types/opportunity";

export function KanbanCard({
  opportunity,
  dragHandleOnly = false,
}: {
  opportunity: Opportunity;
  /** true cand cardul e randat in interiorul DragOverlay - fara listeners/Link, e doar vizual. */
  dragHandleOnly?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opportunity.id,
    disabled: dragHandleOnly,
  });

  const style = dragHandleOnly
    ? undefined
    : {
        transform: CSS.Translate.toString(transform),
        // Elementul original devine invizibil cat timp DragOverlay arata
        // versiunea "vie" - altfel ramane sub cursor si poate incurca
        // detectarea coliziunii pentru `over`.
        opacity: isDragging ? 0 : 1,
      };

  const totalValue =
    (opportunity.arr_synergo ?? 0) +
    (opportunity.valoare_implementare_synergo ?? 0) +
    (opportunity.licenta_synergo_onpremise ?? 0);

  // Risc: B-04/B-09 din roadmap - "fara next step" (Activa fara actiune/data),
  // "intarziat" (actiune planificata dar data e in trecut), sau "stagnare"
  // (7+/14+/21+ zile fara miscare, cf. 5.7 din roadmap).
  const todayStr = new Date().toISOString().slice(0, 10);
  const faraNextStep =
    opportunity.status === "Activa" && (!opportunity.actiune || !opportunity.data_actiune);
  const intarziat =
    !faraNextStep &&
    opportunity.status_actiune === "Planificata" &&
    opportunity.data_actiune &&
    opportunity.data_actiune.slice(0, 10) < todayStr;
  const stagnare = computeStagnation(opportunity);
  const showStagnareBadge =
    !faraNextStep && !intarziat && stagnare.severitate !== "ok" && opportunity.status === "Activa";

  const content = (
    <>
      <div className="mb-1.5 flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight text-white">
          {opportunity.nume_potential}
        </p>
        <span
          className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
          style={{
            backgroundColor: `${STATUS_COLORS[opportunity.status]}20`,
            color: STATUS_COLORS[opportunity.status],
          }}
        >
          {opportunity.status}
        </span>
      </div>
      <p className="mb-1.5 text-[11px] text-slate-500">
        {opportunity.judet ?? "—"} · {opportunity.tip_proiect ?? "—"}
      </p>

      {opportunity.actiune && (
        <p className="mb-1.5 truncate text-[11px] text-slate-400">
          <span className="text-slate-500">Next:</span> {opportunity.actiune}
          {opportunity.data_actiune &&
            ` · ${new Date(opportunity.data_actiune).toLocaleDateString("ro-RO")}`}
        </p>
      )}

      {(faraNextStep || intarziat || showStagnareBadge) && (
        <div className="mb-2 flex items-center gap-1">
          {faraNextStep ? (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
              <AlertTriangle size={10} />
              Fara next step
            </span>
          ) : intarziat ? (
            <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
              <AlertCircle size={10} />
              Intarziat
            </span>
          ) : (
            <span
              className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
              style={{
                backgroundColor:
                  stagnare.severitate === "critic"
                    ? "#EF444425"
                    : stagnare.severitate === "risc"
                      ? "#FB923C25"
                      : "#FBBF2425",
                color:
                  stagnare.severitate === "critic"
                    ? "#EF4444"
                    : stagnare.severitate === "risc"
                      ? "#FB923C"
                      : "#FBBF24",
              }}
            >
              <Flame size={10} />
              Stagnare {stagnare.zileInStage}z
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-[#E8007A]">
          {totalValue > 0 ? formatEur(totalValue) : "—"}
        </span>
        <div className="flex items-center gap-1.5">
          <ScoreBadge o={opportunity} />
          <span className="text-[11px] text-slate-500">
            {opportunity.profiles?.full_name?.split(" ")[0] ?? ""}
          </span>
        </div>
      </div>
    </>
  );

  if (dragHandleOnly) {
    return (
      <div className="rounded-lg border border-[#E8007A]/40 bg-[#161B45] p-3">{content}</div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative rounded-lg border border-white/10 bg-[#161B45] p-3 transition hover:border-white/20"
    >
      {/* Zona dedicata de "grab" - evita orice ambiguitate intre drag si click pe Link */}
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label="Trage pentru a schimba stage-ul"
        className="absolute right-1.5 top-1.5 cursor-grab rounded p-1 text-slate-600 opacity-0 transition hover:bg-white/5 hover:text-slate-300 group-hover:opacity-100 active:cursor-grabbing"
      >
        <GripVertical size={14} />
      </button>
      <Link href={`/oportunitati/${opportunity.id}`} className="block pr-5">
        {content}
      </Link>
    </div>
  );
}

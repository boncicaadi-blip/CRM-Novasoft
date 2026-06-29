"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, AlertTriangle, AlertCircle } from "lucide-react";
import { STATUS_COLORS } from "@/lib/constants";
import { formatEur } from "@/lib/format";
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

  // Risc: B-04/B-09 din roadmap - "fara next step" (Activa fara actiune/data)
  // sau "intarziat" (actiune planificata dar data e in trecut).
  const todayStr = new Date().toISOString().slice(0, 10);
  const faraNextStep =
    opportunity.status === "Activa" && (!opportunity.actiune || !opportunity.data_actiune);
  const intarziat =
    !faraNextStep &&
    opportunity.status_actiune === "Planificata" &&
    opportunity.data_actiune &&
    opportunity.data_actiune.slice(0, 10) < todayStr;

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
      <p className="mb-2 text-[11px] text-slate-500">
        {opportunity.judet ?? "—"} · {opportunity.tip_proiect ?? "—"}
      </p>
      {(faraNextStep || intarziat) && (
        <div className="mb-2 flex items-center gap-1">
          {faraNextStep ? (
            <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
              <AlertTriangle size={10} />
              Fara next step
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
              <AlertCircle size={10} />
              Intarziat
            </span>
          )}
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-[#E8007A]">
          {totalValue > 0 ? formatEur(totalValue) : "—"}
        </span>
        <span className="text-[11px] text-slate-500">
          {opportunity.profiles?.full_name?.split(" ")[0] ?? ""}
        </span>
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

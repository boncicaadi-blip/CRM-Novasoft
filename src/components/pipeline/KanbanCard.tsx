"use client";

import Link from "next/link";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { STATUS_COLORS } from "@/lib/constants";
import type { Opportunity } from "@/types/opportunity";

const currency = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 });

export function KanbanCard({ opportunity }: { opportunity: Opportunity }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: opportunity.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.4 : 1,
  };

  const totalValue =
    (opportunity.arr_synergo ?? 0) +
    (opportunity.valoare_implementare_synergo ?? 0) +
    (opportunity.licenta_synergo_onpremise ?? 0);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab rounded-lg border border-white/10 bg-[#101724] p-3 transition hover:border-white/20 active:cursor-grabbing"
    >
      <Link
        href={`/oportunitati/${opportunity.id}`}
        onClick={(e) => isDragging && e.preventDefault()}
        className="block"
      >
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
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-[#2DD4BF]">
            {totalValue > 0 ? `${currency.format(totalValue)} lei` : "—"}
          </span>
          <span className="text-[11px] text-slate-500">
            {opportunity.profiles?.full_name?.split(" ")[0] ?? ""}
          </span>
        </div>
      </Link>
    </div>
  );
}

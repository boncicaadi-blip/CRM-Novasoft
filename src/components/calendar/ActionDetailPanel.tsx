"use client";

import Link from "next/link";
import { AlertCircle, Clock, CheckCircle2, ArrowRight, X } from "lucide-react";
import type { CalendarAction } from "@/lib/analytics";
import { STAGE_COLORS } from "@/lib/constants";

const STATUS_LABELS: Record<CalendarAction["status"], string> = {
  restanta: "Restanta",
  viitoare: "Viitoare",
  finalizata: "Finalizata",
};

export function ActionDetailPanel({
  action,
  onClose,
}: {
  action: CalendarAction;
  onClose: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <StatusIcon status={action.status} />
          <span className="text-xs text-slate-400">{STATUS_LABELS[action.status]}</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-slate-500 transition hover:bg-white/5 hover:text-white"
          title="Inchide"
        >
          <X size={15} />
        </button>
      </div>

      <p className="mb-1 text-base font-medium text-white">{action.numePotential}</p>
      <span
        className="mb-3 inline-block rounded-full px-2 py-0.5 text-[11px]"
        style={{
          backgroundColor: `${STAGE_COLORS[action.stage] ?? "#94A3B8"}20`,
          color: STAGE_COLORS[action.stage] ?? "#94A3B8",
        }}
      >
        {action.stage}
      </span>

      <div className="space-y-2 border-t border-white/5 pt-3 text-sm">
        <div>
          <p className="text-[11px] text-slate-500">Actiune</p>
          <p className="text-slate-200">{action.actiune ?? "—"}</p>
        </div>
        {action.dataFinalizare && (
          <div>
            <p className="text-[11px] text-slate-500">Data finalizare</p>
            <p className="text-slate-200">
              {new Date(action.dataFinalizare).toLocaleDateString("ro-RO")}
            </p>
          </div>
        )}
        <div>
          <p className="text-[11px] text-slate-500">Observatii</p>
          <p className="text-slate-300">{action.observatiiActiune ?? "—"}</p>
        </div>
      </div>

      <Link
        href={`/oportunitati/${action.opportunityId}`}
        className="mt-3 flex items-center gap-1 text-sm text-[#E8007A] hover:text-[#FF4FAA]"
      >
        Vezi fisa completa
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

function StatusIcon({ status }: { status: CalendarAction["status"] }) {
  if (status === "finalizata") return <CheckCircle2 size={13} className="text-green-400" />;
  if (status === "restanta") return <AlertCircle size={13} className="text-slate-400" />;
  return <Clock size={13} className="text-[#0070F3]" />;
}

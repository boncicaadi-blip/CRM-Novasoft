"use client";

import Link from "next/link";
import { AlertCircle, Clock, CheckCircle2, ArrowRight, X } from "lucide-react";
import type { CalendarAction } from "@/lib/analytics";
import { STAGE_COLORS } from "@/lib/constants";

const STATUS_LABELS: Record<CalendarAction["status"], string> = {
  restanta: "Restanta",
  azi: "Azi",
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
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <StatusIcon status={action.status} />
          <span className="text-xs text-text-secondary">{STATUS_LABELS[action.status]}</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-text-muted transition hover:bg-surface-1 hover:text-text-primary"
          title="Inchide"
        >
          <X size={15} />
        </button>
      </div>

      <p className="mb-1 text-base font-medium text-text-primary">{action.numePotential}</p>
      <span
        className="mb-3 inline-block rounded-full px-2 py-0.5 text-[11px]"
        style={{
          backgroundColor: `${STAGE_COLORS[action.stage] ?? "var(--text-secondary)"}20`,
          color: STAGE_COLORS[action.stage] ?? "var(--text-secondary)",
        }}
      >
        {action.stage}
      </span>

      <div className="space-y-2 border-t border-border-faint pt-3 text-sm">
        <div>
          <p className="text-[11px] text-text-muted">Actiune</p>
          <p className="text-text-primary">{action.actiune ?? "—"}</p>
        </div>
        {action.dataFinalizare && (
          <div>
            <p className="text-[11px] text-text-muted">Data finalizare</p>
            <p className="text-text-primary">
              {new Date(action.dataFinalizare).toLocaleDateString("ro-RO")}
            </p>
          </div>
        )}
        <div>
          <p className="text-[11px] text-text-muted">Observatii</p>
          <p className="text-text-primary">{action.observatiiActiune ?? "—"}</p>
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
  if (status === "restanta") return <AlertCircle size={13} className="text-text-secondary" />;
  return <Clock size={13} className="text-[#0070F3]" />;
}

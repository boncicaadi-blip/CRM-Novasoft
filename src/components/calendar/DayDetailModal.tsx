"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ro } from "date-fns/locale";
import { X, AlertCircle, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import type { CalendarAction } from "@/lib/analytics";
import { STAGE_COLORS } from "@/lib/constants";

function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const STATUS_LABELS: Record<CalendarAction["status"], string> = {
  restanta: "Restanta",
  viitoare: "Viitoare",
  finalizata: "Finalizata",
};

const STATUS_COLORS: Record<CalendarAction["status"], string> = {
  restanta: "#94A3B8",
  viitoare: "#0070F3",
  finalizata: "#22C55E",
};

export function DayDetailModal({
  dateStr,
  actions,
  onClose,
}: {
  dateStr: string;
  actions: CalendarAction[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-[#0B0D1A] p-5"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-heading text-lg text-white">
            {format(parseLocalDate(dateStr), "d MMMM yyyy", { locale: ro })}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {actions.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Nicio actiune in aceasta zi.</p>
        ) : (
          <div className="space-y-2">
            {actions.map((a) => (
              <Link
                key={a.id}
                href={`/oportunitati/${a.opportunityId}`}
                className="block rounded-lg border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/20"
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <StatusIcon status={a.status} />
                    <span className="font-medium text-white">{a.numePotential}</span>
                  </div>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px]"
                    style={{
                      backgroundColor: `${STATUS_COLORS[a.status]}20`,
                      color: STATUS_COLORS[a.status],
                    }}
                  >
                    {STATUS_LABELS[a.status]}
                  </span>
                </div>
                <p className="mb-1.5 text-sm text-slate-400">{a.actiune ?? "—"}</p>
                <div className="flex items-center justify-between">
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px]"
                    style={{
                      backgroundColor: `${STAGE_COLORS[a.stage] ?? "#94A3B8"}20`,
                      color: STAGE_COLORS[a.stage] ?? "#94A3B8",
                    }}
                  >
                    {a.stage}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[#E8007A]">
                    Vezi fisa
                    <ArrowRight size={12} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: CalendarAction["status"] }) {
  if (status === "finalizata") return <CheckCircle2 size={14} className="text-green-400" />;
  if (status === "restanta") return <AlertCircle size={14} className="text-slate-400" />;
  return <Clock size={14} className="text-[#0070F3]" />;
}

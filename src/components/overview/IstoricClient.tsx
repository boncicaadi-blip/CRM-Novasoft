"use client";

import {
  StickyNote,
  Phone,
  Mail,
  Presentation,
  FileText,
  Repeat,
  ArrowRightLeft,
  RefreshCw,
  CheckCircle2,
  CalendarClock,
  Sparkles,
} from "lucide-react";
import { computeStageDurations } from "@/lib/analytics";
import { STAGE_COLORS } from "@/lib/constants";
import type { Opportunity, TimelineEntry, TimelineEntryType } from "@/types/opportunity";

const TYPE_CONFIG: Record<
  TimelineEntryType,
  { icon: typeof StickyNote; color: string; label: string }
> = {
  nota: { icon: StickyNote, color: "#94A3B8", label: "Nota" },
  call: { icon: Phone, color: "#0070F3", label: "Call" },
  email: { icon: Mail, color: "#0070F3", label: "Email" },
  demo: { icon: Presentation, color: "#FBBF24", label: "Demo" },
  oferta_trimisa: { icon: FileText, color: "#E8007A", label: "Oferta trimisa" },
  follow_up: { icon: Repeat, color: "#22D3EE", label: "Follow-up" },
  schimbare_stage: { icon: ArrowRightLeft, color: "#60A5FA", label: "Schimbare Stage" },
  schimbare_status: { icon: RefreshCw, color: "#FB923C", label: "Schimbare Status" },
  actiune_finalizata: { icon: CheckCircle2, color: "#22C55E", label: "Actiune finalizata" },
  actiune_setata: { icon: CalendarClock, color: "#A78BFA", label: "Actiune programata" },
  creare: { icon: Sparkles, color: "#E8007A", label: "Intrare in sistem" },
};

export function IstoricClient({
  opportunity,
  timeline,
}: {
  opportunity: Opportunity;
  timeline: TimelineEntry[];
}) {
  const stageDurations = computeStageDurations(timeline);
  // timeline e sortat descrescator (din getTimeline) - pentru cronologie
  // "de la intrare la azi" il afisam crescator.
  const chronological = [...timeline].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="px-3 py-4 sm:px-6">
      <p className="text-xs text-slate-500">Trasabilitate completa</p>
      <h1 className="mb-1 text-lg font-heading text-white">{opportunity.nume_potential}</h1>
      <p className="mb-5 text-sm text-slate-500">
        Tot ce s-a intamplat pe aceasta oportunitate, de la intrarea in sistem.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Sumar timp pe stage */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            Timp petrecut pe Stage
          </p>
          <div className="space-y-2.5">
            {stageDurations.map((d, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: STAGE_COLORS[d.stage] ?? "#94A3B8" }}
                  />
                  {d.stage}
                  {!d.dataIesire && (
                    <span className="text-[10px] text-slate-500">(curent)</span>
                  )}
                </span>
                <span className="font-mono text-xs text-slate-400">{d.zile}z</span>
              </div>
            ))}
            {stageDurations.length === 0 && (
              <p className="text-xs text-slate-500">Nu exista inca date suficiente.</p>
            )}
          </div>
        </div>

        {/* Cronologie completa */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 lg:col-span-2">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
            Cronologie completa ({chronological.length} evenimente)
          </p>
          <div className="relative space-y-0">
            {chronological.map((entry, idx) => {
              const config = TYPE_CONFIG[entry.tip];
              const Icon = config.icon;
              const isLast = idx === chronological.length - 1;
              return (
                <div key={entry.id} className="relative flex gap-3 pb-5">
                  {!isLast && (
                    <div className="absolute left-[11px] top-6 h-full w-px bg-white/10" />
                  )}
                  <div
                    className="z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${config.color}20` }}
                  >
                    <Icon size={12} style={{ color: config.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: config.color }}>
                        {config.label}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {new Date(entry.created_at).toLocaleString("ro-RO", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {entry.profiles?.full_name && (
                        <span className="text-[11px] text-slate-500">
                          · {entry.profiles.full_name}
                        </span>
                      )}
                    </div>
                    {entry.continut && (
                      <p className="mt-0.5 text-sm text-slate-300">{entry.continut}</p>
                    )}
                  </div>
                </div>
              );
            })}
            {chronological.length === 0 && (
              <p className="py-6 text-center text-xs text-slate-500">Niciun eveniment inca.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

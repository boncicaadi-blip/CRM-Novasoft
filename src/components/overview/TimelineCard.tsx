"use client";

import { useRef, useState, useTransition } from "react";
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
  Bot,
  CalendarSync,
} from "lucide-react";
import { addTimelineEntryAction } from "@/lib/actions/timeline";
import { AiSummaryCard } from "@/components/overview/AiSummaryCard";
import { MicButton } from "@/components/ui/MicButton";
import type { TimelineEntry, TimelineEntryType } from "@/types/opportunity";

const MANUAL_TYPES: { value: TimelineEntryType; label: string }[] = [
  { value: "nota", label: "Nota" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "demo", label: "Demo" },
  { value: "oferta_trimisa", label: "Oferta trimisa" },
  { value: "follow_up", label: "Follow-up" },
];

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
  ai_rezumat: { icon: Bot, color: "#C084FC", label: "Rezumat AI" },
  actiune_reprogramata: { icon: CalendarSync, color: "#FBBF24", label: "Actiune reprogramata" },
};

export function TimelineCard({
  opportunityId,
  entries,
}: {
  opportunityId: string;
  entries: TimelineEntry[];
}) {
  const [isPending, startTransition] = useTransition();
  const [tip, setTip] = useState<TimelineEntryType>("nota");
  const [continut, setContinut] = useState("");
  const [error, setError] = useState<string | null>(null);
  const notaInputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await addTimelineEntryAction(opportunityId, tip, continut);
      if (result.success) {
        setContinut("");
      } else {
        setError(result.message ?? "Eroare la adaugare.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 lg:col-span-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Timeline</p>
        <AiSummaryCard opportunityId={opportunityId} />
      </div>

      <form onSubmit={handleSubmit} className="mb-4 space-y-2">
        <div className="flex gap-2">
          <select
            value={tip}
            onChange={(e) => setTip(e.target.value as TimelineEntryType)}
            className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#E8007A]"
          >
            {MANUAL_TYPES.map((t) => (
              <option key={t.value} value={t.value} style={{ backgroundColor: "#111535" }}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            ref={notaInputRef}
            value={continut}
            onChange={(e) => setContinut(e.target.value)}
            placeholder="Ce s-a discutat / context..."
            className="flex-1 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-white outline-none focus:border-[#E8007A]"
          />
          <MicButton
            targetRef={notaInputRef}
            className="shrink-0 border border-white/10 bg-white/[0.04]"
          />
          <button
            type="submit"
            disabled={isPending}
            className="shrink-0 rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
          >
            {isPending ? "..." : "Adauga"}
          </button>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </form>

      <div className="max-h-[400px] space-y-3 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-track]:bg-transparent">
        {entries.map((entry) => {
          const config = TYPE_CONFIG[entry.tip];
          const Icon = config.icon;
          return (
            <div key={entry.id} className="flex gap-2.5">
              <div
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${config.color}20` }}
              >
                <Icon size={12} style={{ color: config.color }} />
              </div>
              <div className="min-w-0 flex-1 pb-3">
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
                  <p className="mt-0.5 whitespace-pre-line text-sm text-slate-300">
                    {entry.continut}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        {entries.length === 0 && (
          <p className="py-6 text-center text-xs text-slate-500">
            Niciun eveniment inca. Adauga prima nota sau interactiune.
          </p>
        )}
      </div>
    </div>
  );
}

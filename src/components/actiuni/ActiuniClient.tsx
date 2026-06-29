"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, Clock, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { buildActionWorkItems, type ActionWorkItemFilter } from "@/lib/analytics";
import { formatEur } from "@/lib/format";
import { STAGE_COLORS } from "@/lib/constants";
import {
  finalizeActionAction,
  postponeActionAction,
  rescheduleActionAction,
} from "@/lib/actions/opportunities";
import type { Opportunity } from "@/types/opportunity";

const FILTERS: { key: ActionWorkItemFilter; label: string }[] = [
  { key: "azi", label: "Azi" },
  { key: "intarziate", label: "Intarziate" },
  { key: "saptamana", label: "Urmatoarele 7 zile" },
  { key: "fara_next_step", label: "Fara next step" },
  { key: "finalizate", label: "Finalizate" },
];

export function ActiuniClient({ opportunities }: { opportunities: Opportunity[] }) {
  const [filter, setFilter] = useState<ActionWorkItemFilter>("intarziate");
  const items = buildActionWorkItems(opportunities, filter);

  const counts = {
    azi: buildActionWorkItems(opportunities, "azi").length,
    intarziate: buildActionWorkItems(opportunities, "intarziate").length,
    saptamana: buildActionWorkItems(opportunities, "saptamana").length,
    fara_next_step: buildActionWorkItems(opportunities, "fara_next_step").length,
    finalizate: buildActionWorkItems(opportunities, "finalizate").length,
  };

  return (
    <div className="px-3 py-4 sm:px-6">
      <h1 className="mb-1 text-lg font-heading text-white">Actiuni</h1>
      <p className="mb-4 text-sm text-slate-500">
        Ce trebuie facut astazi, ce e intarziat si ce risca sa fie uitat.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition ${
              filter === f.key
                ? "border-[#E8007A] bg-[#E8007A]/10 text-[#E8007A]"
                : "border-white/10 text-slate-400 hover:bg-white/5"
            }`}
          >
            {f.label}
            <span className="rounded-full bg-white/10 px-1.5 text-[11px]">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <ActionRow key={item.opportunity.id} item={item} filter={filter} />
        ))}
        {items.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">
            Nimic aici - foarte bine, inseamna ca ai prins tot.
          </p>
        )}
      </div>
    </div>
  );
}

function severityLabel(daysOverdue: number): { label: string; color: string } | null {
  if (daysOverdue <= 0) return null;
  if (daysOverdue <= 3) return { label: `${daysOverdue}z`, color: "#F59E0B" };
  if (daysOverdue <= 7) return { label: `${daysOverdue}z`, color: "#FB923C" };
  return { label: `${daysOverdue}z`, color: "#EF4444" };
}

function ActionRow({
  item,
  filter,
}: {
  item: { opportunity: Opportunity; daysOverdue: number };
  filter: ActionWorkItemFilter;
}) {
  const { opportunity: o, daysOverdue } = item;
  const [isPending, startTransition] = useTransition();
  const [showFinalize, setShowFinalize] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);

  const severity = filter !== "fara_next_step" && filter !== "finalizate" ? severityLabel(daysOverdue) : null;
  const value = (o.forecast_total_saas ?? 0) + (o.forecast_total_onpremise ?? 0);

  function handlePostpone() {
    startTransition(() => postponeActionAction(o.id, 7));
  }

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            {filter === "fara_next_step" ? (
              <AlertTriangle size={14} className="shrink-0 text-amber-400" />
            ) : severity ? (
              <AlertCircle size={14} className="shrink-0" style={{ color: severity.color }} />
            ) : filter === "finalizate" ? (
              <CheckCircle2 size={14} className="shrink-0 text-green-400" />
            ) : (
              <Clock size={14} className="shrink-0 text-[#0070F3]" />
            )}
            <Link
              href={`/oportunitati/${o.id}`}
              className="truncate text-sm font-medium text-white hover:text-[#E8007A]"
            >
              {o.nume_potential}
            </Link>
            <span
              className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px]"
              style={{
                backgroundColor: `${STAGE_COLORS[o.stage] ?? "#94A3B8"}20`,
                color: STAGE_COLORS[o.stage] ?? "#94A3B8",
              }}
            >
              {o.stage}
            </span>
            {severity && (
              <span
                className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: `${severity.color}20`, color: severity.color }}
              >
                {severity.label}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {o.actiune ?? "Fara actiune definita"}
            {o.data_actiune && ` · ${new Date(o.data_actiune).toLocaleDateString("ro-RO")}`}
            {o.profiles?.full_name && ` · ${o.profiles.full_name}`}
          </p>
        </div>
        <span className="shrink-0 font-mono text-xs text-[#E8007A]">
          {value > 0 ? formatEur(value) : ""}
        </span>
      </div>

      {filter !== "finalizate" && filter !== "fara_next_step" && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            onClick={() => setShowFinalize((v) => !v)}
            className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-300 transition hover:bg-white/5"
          >
            Finalizeaza
          </button>
          <button
            onClick={handlePostpone}
            disabled={isPending}
            className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-300 transition hover:bg-white/5"
          >
            Amana 7 zile
          </button>
          <button
            onClick={() => setShowReschedule((v) => !v)}
            className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-300 transition hover:bg-white/5"
          >
            Reprogrameaza
          </button>
          <Link
            href={`/oportunitati/${o.id}`}
            className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1 text-[11px] text-slate-300 transition hover:bg-white/5"
          >
            Deschide
            <ArrowRight size={11} />
          </Link>
        </div>
      )}

      {filter === "fara_next_step" && (
        <Link
          href={`/oportunitati/${o.id}`}
          className="mt-2 inline-flex items-center gap-1 rounded-md border border-amber-500/30 px-2 py-1 text-[11px] text-amber-400 transition hover:bg-amber-500/10"
        >
          Adauga next step
          <ArrowRight size={11} />
        </Link>
      )}

      {showFinalize && (
        <FinalizeForm
          opportunityId={o.id}
          onDone={() => setShowFinalize(false)}
        />
      )}
      {showReschedule && (
        <RescheduleForm opportunityId={o.id} onDone={() => setShowReschedule(false)} />
      )}
    </div>
  );
}

function FinalizeForm({ opportunityId, onDone }: { opportunityId: string; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [rezultat, setRezultat] = useState("");
  const [nextActiune, setNextActiune] = useState("");
  const [nextData, setNextData] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rezultat.trim()) return;
    startTransition(async () => {
      await finalizeActionAction(
        opportunityId,
        rezultat,
        nextActiune && nextData ? { actiune: nextActiune, dataActiune: nextData } : undefined
      );
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-2 rounded-md bg-white/[0.03] p-2.5">
      <div>
        <label className="mb-1 block text-[11px] text-slate-500">Rezultat actiune *</label>
        <input
          required
          value={rezultat}
          onChange={(e) => setRezultat(e.target.value)}
          placeholder="Ce s-a discutat / rezultat..."
          className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-white outline-none focus:border-[#E8007A]"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[11px] text-slate-500">Urmatorul pas</label>
          <input
            value={nextActiune}
            onChange={(e) => setNextActiune(e.target.value)}
            placeholder="opțional"
            className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-white outline-none focus:border-[#E8007A]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-slate-500">Data</label>
          <input
            type="date"
            value={nextData}
            onChange={(e) => setNextData(e.target.value)}
            className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-white outline-none focus:border-[#E8007A]"
          />
        </div>
      </div>
      <div className="flex gap-1.5">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-[#E8007A] px-2.5 py-1.5 text-[11px] font-medium text-[#0B0D1A] disabled:opacity-50"
        >
          {isPending ? "Se salveaza..." : "Confirma"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-md px-2.5 py-1.5 text-[11px] text-slate-400 hover:bg-white/5"
        >
          Anuleaza
        </button>
      </div>
    </form>
  );
}

function RescheduleForm({ opportunityId, onDone }: { opportunityId: string; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [date, setDate] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) return;
    startTransition(async () => {
      await rescheduleActionAction(opportunityId, date);
      onDone();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex gap-1.5 rounded-md bg-white/[0.03] p-2.5">
      <input
        type="date"
        required
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="flex-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-white outline-none focus:border-[#E8007A]"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-[#E8007A] px-2.5 py-1.5 text-[11px] font-medium text-[#0B0D1A] disabled:opacity-50"
      >
        Salveaza
      </button>
      <button
        type="button"
        onClick={onDone}
        className="rounded-md px-2.5 py-1.5 text-[11px] text-slate-400 hover:bg-white/5"
      >
        X
      </button>
    </form>
  );
}

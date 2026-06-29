"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, AlertCircle, Flame } from "lucide-react";
import { STAGE_COLORS, STATUS_COLORS } from "@/lib/constants";
import { formatEur } from "@/lib/format";
import { computeStagnation } from "@/lib/analytics";
import type { Opportunity } from "@/types/opportunity";

type SortKey =
  | "nume_potential"
  | "stage"
  | "status"
  | "arr_synergo"
  | "mrr_synergo"
  | "forecast_total_saas"
  | "updated_at"
  | "data_actiune";

export function PipelineTable({ opportunities }: { opportunities: Opportunity[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  const sorted = useMemo(() => {
    return [...opportunities].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });
  }, [opportunities, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  const totals = useMemo(() => {
    return sorted.reduce(
      (acc, o) => ({
        arr: acc.arr + (o.arr_synergo ?? 0),
        mrr: acc.mrr + (o.mrr_synergo ?? 0),
        forecast: acc.forecast + (o.forecast_total_saas ?? 0),
      }),
      { arr: 0, mrr: 0, forecast: 0 }
    );
  }, [sorted]);

  return (
    <div className="flex h-full flex-col px-3 py-4 sm:px-6">
      <div className="flex-1 overflow-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-white/10 bg-[#111535] text-left text-xs text-slate-500">
              <Th label="Firma" onClick={() => toggleSort("nume_potential")} sticky />
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Cod fiscal</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Domeniu</th>
              <Th label="Stage" onClick={() => toggleSort("stage")} />
              <Th label="Status" onClick={() => toggleSort("status")} />
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Risc</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Substatus</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Responsabil</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Judet</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Tip proiect</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Actiune</th>
              <Th label="Data actiune" onClick={() => toggleSort("data_actiune")} />
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Canal intrare</th>
              <Th label="MRR" onClick={() => toggleSort("mrr_synergo")} align="right" />
              <Th label="ARR" onClick={() => toggleSort("arr_synergo")} align="right" />
              <Th
                label="Forecast"
                onClick={() => toggleSort("forecast_total_saas")}
                align="right"
              />
              <Th label="Actualizat" onClick={() => toggleSort("updated_at")} align="right" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((o) => (
              <tr key={o.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                <td className="sticky left-0 z-[1] bg-[#0B0D1A] px-3 py-2.5">
                  <Link
                    href={`/oportunitati/${o.id}`}
                    className="font-medium text-white hover:text-[#E8007A]"
                  >
                    {o.nume_potential}
                  </Link>
                  <p className="text-[11px] text-slate-500">{o.nume_grup}</p>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">
                  {o.cod_fiscal ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">
                  {o.domeniul_activitate ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: `${STAGE_COLORS[o.stage]}20`,
                      color: STAGE_COLORS[o.stage],
                    }}
                  >
                    {o.stage}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: `${STATUS_COLORS[o.status]}20`,
                      color: STATUS_COLORS[o.status],
                    }}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <RiskBadge o={o} />
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">
                  {o.substatus ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">
                  {o.profiles?.full_name ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">{o.judet ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">
                  {o.tip_proiect ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">
                  {o.actiune ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">
                  {o.data_actiune ? new Date(o.data_actiune).toLocaleDateString("ro-RO") : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-slate-400">
                  {o.canal_intrare ?? "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-slate-300">
                  {o.mrr_synergo > 0 ? formatEur(o.mrr_synergo) : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[#E8007A]">
                  {o.arr_synergo > 0 ? formatEur(o.arr_synergo) : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-[#0070F3]">
                  {o.forecast_total_saas > 0 ? formatEur(o.forecast_total_saas) : "—"}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs text-slate-500">
                  {new Date(o.updated_at).toLocaleDateString("ro-RO")}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={17} className="px-3 py-8 text-center text-slate-500">
                  Nicio oportunitate gasita.
                </td>
              </tr>
            )}
          </tbody>
          {sorted.length > 0 && (
            <tfoot>
              <tr className="border-t border-white/10 bg-white/[0.02] font-medium">
                <td className="sticky left-0 bg-[#111535] px-3 py-2.5 text-white" colSpan={13}>
                  Total ({sorted.length} oportunitati)
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-slate-200">
                  {formatEur(totals.mrr)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[#E8007A]">
                  {formatEur(totals.arr)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-[#0070F3]">
                  {formatEur(totals.forecast)}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function Th({
  label,
  onClick,
  align = "left",
  sticky = false,
}: {
  label: string;
  onClick: () => void;
  align?: "left" | "right";
  sticky?: boolean;
}) {
  return (
    <th
      onClick={onClick}
      className={`cursor-pointer whitespace-nowrap px-3 py-2.5 font-medium transition hover:text-slate-300 ${
        align === "right" ? "text-right" : "text-left"
      } ${sticky ? "sticky left-0 z-10 bg-[#111535]" : ""}`}
    >
      {label}
    </th>
  );
}

/** Badge de risc (B-09): fara next step, intarziat, sau stagnare - aceeasi logica ca pe KanbanCard. */
function RiskBadge({ o }: { o: Opportunity }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const faraNextStep = o.status === "Activa" && (!o.actiune || !o.data_actiune);
  const intarziat =
    !faraNextStep &&
    o.status_actiune === "Planificata" &&
    o.data_actiune &&
    o.data_actiune.slice(0, 10) < todayStr;
  const stagnare = computeStagnation(o);
  const showStagnareBadge = !faraNextStep && !intarziat && stagnare.severitate !== "ok" && o.status === "Activa";

  if (faraNextStep) {
    return (
      <span className="flex w-fit items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
        <AlertTriangle size={10} />
        Fara next step
      </span>
    );
  }
  if (intarziat) {
    return (
      <span className="flex w-fit items-center gap-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
        <AlertCircle size={10} />
        Intarziat
      </span>
    );
  }
  if (showStagnareBadge) {
    const color =
      stagnare.severitate === "critic" ? "#EF4444" : stagnare.severitate === "risc" ? "#FB923C" : "#FBBF24";
    return (
      <span
        className="flex w-fit items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
        style={{ backgroundColor: `${color}25`, color }}
      >
        <Flame size={10} />
        {stagnare.zileInStage}z
      </span>
    );
  }
  return <span className="text-xs text-slate-600">—</span>;
}

"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { AlertTriangle, AlertCircle, Flame } from "lucide-react";
import { getTodayISO } from "@/lib/date";
import { STAGE_COLORS, STATUS_COLORS } from "@/lib/constants";
import { formatEur } from "@/lib/format";
import { computeStagnation, computeOpportunityScore } from "@/lib/analytics";
import { ScoreBadge } from "@/components/ScoreBadge";
import type { Opportunity } from "@/types/opportunity";

type SortKey =
  | "nume_potential"
  | "stage"
  | "status"
  | "arr_synergo"
  | "mrr_synergo"
  | "forecast_total_saas"
  | "updated_at"
  | "data_actiune"
  | "score";

const COLUMN_KEYS = [
  "firma", "codFiscal", "domeniu", "stage", "status", "risc", "scor", "substatus",
  "responsabil", "judet", "tipProiect", "actiune", "dataActiune", "canalIntrare",
  "mrr", "arr", "forecast", "actualizat",
] as const;

const DEFAULT_WIDTHS: Record<string, number> = {
  firma: 200, codFiscal: 110, domeniu: 140, stage: 120, status: 110, risc: 130, scor: 70,
  substatus: 120, responsabil: 120, judet: 100, tipProiect: 110, actiune: 130,
  dataActiune: 110, canalIntrare: 120, mrr: 100, arr: 100, forecast: 110, actualizat: 100,
};

export function PipelineTable({ opportunities }: { opportunities: Opportunity[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [colWidths, setColWidths] = useState<Record<string, number>>(DEFAULT_WIDTHS);

  function startResize(key: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidths[key] ?? 120;
    function onMove(ev: MouseEvent) {
      const newWidth = Math.max(60, startWidth + (ev.clientX - startX));
      setColWidths((prev) => ({ ...prev, [key]: newWidth }));
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const sorted = useMemo(() => {
    return [...opportunities].sort((a, b) => {
      if (sortKey === "score") {
        const av = computeOpportunityScore(a).total;
        const bv = computeOpportunityScore(b).total;
        return (av - bv) * sortDir;
      }
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
        <table className="w-full table-fixed text-sm">
          <colgroup>
            {COLUMN_KEYS.map((key) => (
              <col key={key} style={{ width: colWidths[key] }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-white/10 bg-[#111535] text-left text-xs text-slate-500">
              <Th label="Firma" onClick={() => toggleSort("nume_potential")} sticky colKey="firma" width={colWidths.firma} onResize={startResize} />
              <Th label="Cod fiscal" colKey="codFiscal" width={colWidths.codFiscal} onResize={startResize} />
              <Th label="Domeniu" colKey="domeniu" width={colWidths.domeniu} onResize={startResize} />
              <Th label="Stage" onClick={() => toggleSort("stage")} colKey="stage" width={colWidths.stage} onResize={startResize} />
              <Th label="Status" onClick={() => toggleSort("status")} colKey="status" width={colWidths.status} onResize={startResize} />
              <Th label="Risc" colKey="risc" width={colWidths.risc} onResize={startResize} />
              <Th label="Scor" onClick={() => toggleSort("score")} colKey="scor" width={colWidths.scor} onResize={startResize} />
              <Th label="Substatus" colKey="substatus" width={colWidths.substatus} onResize={startResize} />
              <Th label="Responsabil" colKey="responsabil" width={colWidths.responsabil} onResize={startResize} />
              <Th label="Judet" colKey="judet" width={colWidths.judet} onResize={startResize} />
              <Th label="Tip proiect" colKey="tipProiect" width={colWidths.tipProiect} onResize={startResize} />
              <Th label="Actiune" colKey="actiune" width={colWidths.actiune} onResize={startResize} />
              <Th label="Data actiune" onClick={() => toggleSort("data_actiune")} colKey="dataActiune" width={colWidths.dataActiune} onResize={startResize} />
              <Th label="Canal intrare" colKey="canalIntrare" width={colWidths.canalIntrare} onResize={startResize} />
              <Th label="MRR" onClick={() => toggleSort("mrr_synergo")} align="right" colKey="mrr" width={colWidths.mrr} onResize={startResize} />
              <Th label="ARR" onClick={() => toggleSort("arr_synergo")} align="right" colKey="arr" width={colWidths.arr} onResize={startResize} />
              <Th
                label="Forecast"
                onClick={() => toggleSort("forecast_total_saas")}
                align="right"
                colKey="forecast"
                width={colWidths.forecast}
                onResize={startResize}
              />
              <Th label="Actualizat" onClick={() => toggleSort("updated_at")} align="right" colKey="actualizat" width={colWidths.actualizat} onResize={startResize} />
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
                <td className="whitespace-nowrap px-3 py-2.5">
                  <ScoreBadge o={o} />
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
                <td colSpan={18} className="px-3 py-8 text-center text-slate-500">
                  Nicio oportunitate gasita.
                </td>
              </tr>
            )}
          </tbody>
          {sorted.length > 0 && (
            <tfoot>
              <tr className="border-t border-white/10 bg-white/[0.02] font-medium">
                <td className="sticky left-0 bg-[#111535] px-3 py-2.5 text-white" colSpan={14}>
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
  colKey,
  width,
  onResize,
}: {
  label: string;
  onClick?: () => void;
  align?: "left" | "right";
  sticky?: boolean;
  colKey?: string;
  width?: number;
  onResize?: (key: string, e: React.MouseEvent) => void;
}) {
  return (
    <th
      onClick={onClick}
      style={width ? { width, minWidth: width, maxWidth: width } : undefined}
      className={`relative select-none whitespace-nowrap px-3 py-2.5 font-medium transition ${
        onClick ? "cursor-pointer hover:text-slate-300" : ""
      } ${align === "right" ? "text-right" : "text-left"} ${sticky ? "sticky left-0 z-10 bg-[#111535]" : ""}`}
    >
      {label}
      {colKey && onResize && (
        <div
          onMouseDown={(e) => onResize(colKey, e)}
          className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-[#E8007A]/50"
        />
      )}
    </th>
  );
}

/** Celula de scor oportunitate (B-12) cu tooltip de detalii. */
/** Badge de risc (B-09): fara next step, intarziat, sau stagnare - aceeasi logica ca pe KanbanCard. */
function RiskBadge({ o }: { o: Opportunity }) {
  const todayStr = getTodayISO();
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

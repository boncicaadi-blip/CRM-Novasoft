"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { STAGE_COLORS, STATUS_COLORS } from "@/lib/constants";
import { formatEur } from "@/lib/format";
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

const STAGE_FILTER_ALL = "Toate";
const STATUS_FILTER_ALL = "Toate";

export function PipelineTable({ opportunities }: { opportunities: Opportunity[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState(STAGE_FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);

  const stages = useMemo(
    () => [STAGE_FILTER_ALL, ...Array.from(new Set(opportunities.map((o) => o.stage)))],
    [opportunities]
  );
  const statuses = useMemo(
    () => [STATUS_FILTER_ALL, ...Array.from(new Set(opportunities.map((o) => o.status)))],
    [opportunities]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = opportunities;
    if (q) {
      rows = rows.filter(
        (o) =>
          o.nume_potential.toLowerCase().includes(q) ||
          o.nume_grup.toLowerCase().includes(q) ||
          (o.judet ?? "").toLowerCase().includes(q) ||
          (o.cod_fiscal ?? "").toLowerCase().includes(q)
      );
    }
    if (stageFilter !== STAGE_FILTER_ALL) {
      rows = rows.filter((o) => o.stage === stageFilter);
    }
    if (statusFilter !== STATUS_FILTER_ALL) {
      rows = rows.filter((o) => o.status === statusFilter);
    }
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });
  }, [opportunities, search, stageFilter, statusFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, o) => ({
        arr: acc.arr + (o.arr_synergo ?? 0),
        mrr: acc.mrr + (o.mrr_synergo ?? 0),
        forecast: acc.forecast + (o.forecast_total_saas ?? 0),
      }),
      { arr: 0, mrr: 0, forecast: 0 }
    );
  }, [filtered]);

  return (
    <div className="flex h-full flex-col px-3 py-4 sm:px-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cauta firma, grup, judet sau cod fiscal..."
          className="w-64 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
        />
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
        >
          {stages.map((s) => (
            <option key={s} value={s} style={{ backgroundColor: "#111535", color: "#F1F5F9" }}>
              {s === STAGE_FILTER_ALL ? "Toate stage-urile" : s}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
        >
          {statuses.map((s) => (
            <option key={s} value={s} style={{ backgroundColor: "#111535", color: "#F1F5F9" }}>
              {s === STATUS_FILTER_ALL ? "Toate statusurile" : s}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-slate-500">
          {filtered.length} din {opportunities.length} oportunitati
        </span>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-white/10 bg-[#111535] text-left text-xs text-slate-500">
              <Th label="Firma" onClick={() => toggleSort("nume_potential")} sticky />
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Cod fiscal</th>
              <th className="whitespace-nowrap px-3 py-2.5 font-medium">Domeniu</th>
              <Th label="Stage" onClick={() => toggleSort("stage")} />
              <Th label="Status" onClick={() => toggleSort("status")} />
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
            {filtered.map((o) => (
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={16} className="px-3 py-8 text-center text-slate-500">
                  Nicio oportunitate gasita.
                </td>
              </tr>
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-white/10 bg-white/[0.02] font-medium">
                <td className="sticky left-0 bg-[#111535] px-3 py-2.5 text-white" colSpan={12}>
                  Total ({filtered.length} oportunitati)
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

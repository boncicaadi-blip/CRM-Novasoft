"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { STAGE_COLORS, STATUS_COLORS } from "@/lib/constants";
import type { Opportunity } from "@/types/opportunity";

const currency = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 });

type SortKey = "nume_potential" | "stage" | "status" | "arr_synergo" | "updated_at";

export function PipelineTable({ opportunities }: { opportunities: Opportunity[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = opportunities;
    if (q) {
      rows = rows.filter(
        (o) =>
          o.nume_potential.toLowerCase().includes(q) ||
          o.nume_grup.toLowerCase().includes(q) ||
          (o.judet ?? "").toLowerCase().includes(q)
      );
    }
    return [...rows].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });
  }, [opportunities, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(-1);
    }
  }

  return (
    <div className="px-6 py-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Cauta firma, grup sau judet..."
        className="mb-3 w-full max-w-sm rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
      />
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-left text-xs text-slate-500">
              <Th label="Firma" onClick={() => toggleSort("nume_potential")} />
              <Th label="Stage" onClick={() => toggleSort("stage")} />
              <Th label="Status" onClick={() => toggleSort("status")} />
              <th className="px-3 py-2.5 font-medium">Responsabil</th>
              <th className="px-3 py-2.5 font-medium">Judet</th>
              <Th label="ARR" onClick={() => toggleSort("arr_synergo")} align="right" />
              <Th label="Actualizat" onClick={() => toggleSort("updated_at")} align="right" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((o) => (
              <tr
                key={o.id}
                className="border-b border-white/5 transition hover:bg-white/[0.03]"
              >
                <td className="px-3 py-2.5">
                  <Link href={`/oportunitati/${o.id}`} className="text-white hover:text-[#E8007A]">
                    {o.nume_potential}
                  </Link>
                </td>
                <td className="px-3 py-2.5">
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
                <td className="px-3 py-2.5">
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
                <td className="px-3 py-2.5 text-slate-400">{o.profiles?.full_name ?? "—"}</td>
                <td className="px-3 py-2.5 text-slate-400">{o.judet ?? "—"}</td>
                <td className="px-3 py-2.5 text-right font-mono text-[#E8007A]">
                  {o.arr_synergo > 0 ? `${currency.format(o.arr_synergo)} lei` : "—"}
                </td>
                <td className="px-3 py-2.5 text-right text-xs text-slate-500">
                  {new Date(o.updated_at).toLocaleDateString("ro-RO")}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">
                  Nicio oportunitate gasita.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  label,
  onClick,
  align = "left",
}: {
  label: string;
  onClick: () => void;
  align?: "left" | "right";
}) {
  return (
    <th
      onClick={onClick}
      className={`cursor-pointer px-3 py-2.5 font-medium transition hover:text-slate-300 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {label}
    </th>
  );
}

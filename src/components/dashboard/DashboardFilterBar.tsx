"use client";

import { X } from "lucide-react";
import type { DashboardFilters } from "@/lib/analytics";

const selectClass =
  "rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#E8007A]";
const optionStyle = { backgroundColor: "#111535", color: "#F1F5F9" };

export function DashboardFilterBar({
  filters,
  onChange,
  stages,
  statuses,
  responsabili,
  judete,
}: {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
  stages: string[];
  statuses: string[];
  responsabili: string[];
  judete: string[];
}) {
  const hasActive = Object.values(filters).some((v) => v !== null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={filters.stage ?? ""}
        onChange={(e) => onChange({ ...filters, stage: e.target.value || null })}
        className={selectClass}
      >
        <option value="" style={optionStyle}>
          Toate stage-urile
        </option>
        {stages.map((s) => (
          <option key={s} value={s} style={optionStyle}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={filters.status ?? ""}
        onChange={(e) => onChange({ ...filters, status: e.target.value || null })}
        className={selectClass}
      >
        <option value="" style={optionStyle}>
          Toate statusurile
        </option>
        {statuses.map((s) => (
          <option key={s} value={s} style={optionStyle}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={filters.responsabil ?? ""}
        onChange={(e) => onChange({ ...filters, responsabil: e.target.value || null })}
        className={selectClass}
      >
        <option value="" style={optionStyle}>
          Toti responsabilii
        </option>
        {responsabili.map((r) => (
          <option key={r} value={r} style={optionStyle}>
            {r}
          </option>
        ))}
      </select>

      <select
        value={filters.judet ?? ""}
        onChange={(e) => onChange({ ...filters, judet: e.target.value || null })}
        className={selectClass}
      >
        <option value="" style={optionStyle}>
          Toate judetele
        </option>
        {judete.map((j) => (
          <option key={j} value={j} style={optionStyle}>
            {j}
          </option>
        ))}
      </select>

      {filters.dateFrom && filters.dateTo && (
        <span className="rounded-md border border-[#0070F3]/30 bg-[#0070F3]/10 px-2.5 py-1.5 text-xs text-[#0070F3]">
          {filters.dateFrom} → {filters.dateTo}
        </span>
      )}

      {hasActive && (
        <button
          onClick={() =>
            onChange({
              stage: null,
              status: null,
              responsabil: null,
              judet: null,
              dateFrom: null,
              dateTo: null,
            })
          }
          className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <X size={13} />
          Reseteaza filtrele
        </button>
      )}
    </div>
  );
}

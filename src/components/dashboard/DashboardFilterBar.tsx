"use client";

import { X } from "lucide-react";
import { MultiSelect } from "@/components/ui/MultiSelect";
import {
  hasActiveFilters,
  computePeriodRange,
  type DashboardFilters,
  type PeriodPreset,
} from "@/lib/analytics";

const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: null, label: "Toata perioada" },
  { value: "saptamana", label: "Saptamana curenta" },
  { value: "luna", label: "Luna curenta" },
  { value: "trimestru", label: "Trimestrul curent" },
  { value: "an", label: "Anul curent" },
  { value: "custom", label: "Interval custom..." },
];

const selectClass =
  "rounded-md border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none focus:border-[#E8007A]";
const optionStyle = { backgroundColor: "var(--surface-1)", color: "var(--text-primary)" };

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
  const active = hasActiveFilters(filters);

  function handlePeriodChange(preset: PeriodPreset) {
    if (preset === "custom") {
      onChange({ ...filters, periodPreset: preset });
      return;
    }
    if (!preset) {
      onChange({ ...filters, periodPreset: null, dateFrom: null, dateTo: null });
      return;
    }
    const range = computePeriodRange(preset);
    onChange({
      ...filters,
      periodPreset: preset,
      dateFrom: range?.dateFrom ?? null,
      dateTo: range?.dateTo ?? null,
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        placeholder="Cauta client/oportunitate..."
        className={`${selectClass} min-w-[200px]`}
      />
      <MultiSelect
        label="Stage"
        options={stages}
        selected={filters.stages}
        onChange={(stages) => onChange({ ...filters, stages })}
      />
      <MultiSelect
        label="Status"
        options={statuses}
        selected={filters.statuses}
        onChange={(statuses) => onChange({ ...filters, statuses })}
      />
      <MultiSelect
        label="Responsabil"
        options={responsabili}
        selected={filters.responsabili}
        onChange={(responsabili) => onChange({ ...filters, responsabili })}
      />
      <MultiSelect
        label="Judet"
        options={judete}
        selected={filters.judete}
        onChange={(judete) => onChange({ ...filters, judete })}
      />

      <select
        value={filters.periodPreset ?? ""}
        onChange={(e) => handlePeriodChange((e.target.value || null) as PeriodPreset)}
        className={selectClass}
      >
        {PERIOD_OPTIONS.map((p) => (
          <option key={p.value ?? "none"} value={p.value ?? ""} style={optionStyle}>
            {p.label}
          </option>
        ))}
      </select>

      {filters.periodPreset === "custom" && (
        <>
          <input
            type="date"
            value={filters.dateFrom ?? ""}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value || null })}
            className={selectClass}
          />
          <span className="text-xs text-text-muted">→</span>
          <input
            type="date"
            value={filters.dateTo ?? ""}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value || null })}
            className={selectClass}
          />
        </>
      )}

      {filters.periodPreset && filters.periodPreset !== "custom" && filters.dateFrom && (
        <span className="rounded-md border border-[#0070F3]/30 bg-[#0070F3]/10 px-2.5 py-1.5 text-xs text-[#0070F3]">
          {filters.dateFrom} → {filters.dateTo}
        </span>
      )}

      {active && (
        <button
          onClick={() =>
            onChange({
              stages: [],
              statuses: [],
              responsabili: [],
              judete: [],
              search: "",
              dateFrom: null,
              dateTo: null,
              periodPreset: null,
            })
          }
          className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-text-secondary transition hover:bg-surface-1 hover:text-text-primary"
        >
          <X size={13} />
          Reseteaza filtrele
        </button>
      )}
    </div>
  );
}

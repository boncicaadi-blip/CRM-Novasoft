"use client";

import { MultiSelect } from "@/components/ui/MultiSelect";

export function PipelineFilters({
  search,
  onSearchChange,
  stageFilter,
  onStageFilterChange,
  statusFilter,
  onStatusFilterChange,
  stages,
  statuses,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  stageFilter: string[];
  onStageFilterChange: (v: string[]) => void;
  statusFilter: string[];
  onStatusFilterChange: (v: string[]) => void;
  stages: string[];
  statuses: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Cauta firma, grup, judet sau cod fiscal..."
        className="w-full rounded-md border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none focus:border-[#E8007A] sm:w-64"
      />
      <MultiSelect label="Stage" options={stages} selected={stageFilter} onChange={onStageFilterChange} />
      <MultiSelect
        label="Status"
        options={statuses}
        selected={statusFilter}
        onChange={onStatusFilterChange}
      />
    </div>
  );
}

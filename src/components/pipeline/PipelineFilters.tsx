"use client";

const STAGE_FILTER_ALL = "Toate";
const STATUS_FILTER_ALL = "Toate";

export { STAGE_FILTER_ALL, STATUS_FILTER_ALL };

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
  stageFilter: string;
  onStageFilterChange: (v: string) => void;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  stages: string[];
  statuses: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Cauta firma, grup, judet sau cod fiscal..."
        className="w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#E8007A] sm:w-64"
      />
      <select
        value={stageFilter}
        onChange={(e) => onStageFilterChange(e.target.value)}
        className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
      >
        {[STAGE_FILTER_ALL, ...stages].map((s) => (
          <option key={s} value={s} style={{ backgroundColor: "#111535", color: "#F1F5F9" }}>
            {s === STAGE_FILTER_ALL ? "Toate stage-urile" : s}
          </option>
        ))}
      </select>
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
      >
        {[STATUS_FILTER_ALL, ...statuses].map((s) => (
          <option key={s} value={s} style={{ backgroundColor: "#111535", color: "#F1F5F9" }}>
            {s === STATUS_FILTER_ALL ? "Toate statusurile" : s}
          </option>
        ))}
      </select>
    </div>
  );
}

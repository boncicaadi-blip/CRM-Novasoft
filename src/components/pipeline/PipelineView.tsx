"use client";

import { useState, useMemo } from "react";
import { ViewToggle } from "./ViewToggle";
import { KanbanBoard } from "./KanbanBoard";
import { PipelineTable } from "./PipelineTable";
import { PipelineFilters, STAGE_FILTER_ALL, STATUS_FILTER_ALL } from "./PipelineFilters";
import type { Opportunity } from "@/types/opportunity";

export function PipelineView({
  opportunities,
  stageColors,
}: {
  opportunities: Opportunity[];
  stageColors?: Record<string, string>;
}) {
  const [view, setView] = useState<"kanban" | "table">("kanban");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState(STAGE_FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState(STATUS_FILTER_ALL);

  const stages = useMemo(
    () => Array.from(new Set(opportunities.map((o) => o.stage))),
    [opportunities]
  );
  const statuses = useMemo(
    () => Array.from(new Set(opportunities.map((o) => o.status))),
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
    return rows;
  }, [opportunities, search, stageFilter, statusFilter]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-3 py-4 sm:px-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-heading text-white">Pipeline</h1>
            <p className="text-sm text-slate-500">
              {filtered.length} din {opportunities.length} oportunitati
            </p>
          </div>
          <ViewToggle view={view} onChange={setView} />
        </div>
        <PipelineFilters
          search={search}
          onSearchChange={setSearch}
          stageFilter={stageFilter}
          onStageFilterChange={setStageFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          stages={stages}
          statuses={statuses}
        />
      </div>
      <div className="flex-1 overflow-hidden">
        {view === "kanban" ? (
          <div className="h-full overflow-x-auto">
            <KanbanBoard opportunities={filtered} stageColors={stageColors} />
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <PipelineTable opportunities={filtered} />
          </div>
        )}
      </div>
    </div>
  );
}

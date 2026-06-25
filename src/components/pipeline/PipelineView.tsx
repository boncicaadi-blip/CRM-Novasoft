"use client";

import { useState } from "react";
import { ViewToggle } from "./ViewToggle";
import { KanbanBoard } from "./KanbanBoard";
import { PipelineTable } from "./PipelineTable";
import type { Opportunity } from "@/types/opportunity";

export function PipelineView({ opportunities }: { opportunities: Opportunity[] }) {
  const [view, setView] = useState<"kanban" | "table">("kanban");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <h1 className="text-lg font-heading text-white">Pipeline</h1>
          <p className="text-sm text-slate-500">{opportunities.length} oportunitati</p>
        </div>
        <ViewToggle view={view} onChange={setView} />
      </div>
      <div className="flex-1 overflow-hidden">
        {view === "kanban" ? (
          <div className="h-full overflow-x-auto">
            <KanbanBoard opportunities={opportunities} />
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <PipelineTable opportunities={opportunities} />
          </div>
        )}
      </div>
    </div>
  );
}

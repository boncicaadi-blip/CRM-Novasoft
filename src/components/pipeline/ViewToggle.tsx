"use client";

import { LayoutGrid, List } from "lucide-react";

export function ViewToggle({
  view,
  onChange,
}: {
  view: "kanban" | "table";
  onChange: (v: "kanban" | "table") => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg bg-surface-1 p-1">
      <button
        onClick={() => onChange("kanban")}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition ${
          view === "kanban" ? "bg-surface-2 text-text-primary" : "text-text-muted hover:text-text-primary"
        }`}
      >
        <LayoutGrid size={14} />
        Kanban
      </button>
      <button
        onClick={() => onChange("table")}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition ${
          view === "table" ? "bg-surface-2 text-text-primary" : "text-text-muted hover:text-text-primary"
        }`}
      >
        <List size={14} />
        Lista
      </button>
    </div>
  );
}

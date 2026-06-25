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
    <div className="flex gap-1 rounded-lg bg-white/5 p-1">
      <button
        onClick={() => onChange("kanban")}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition ${
          view === "kanban" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
        }`}
      >
        <LayoutGrid size={14} />
        Kanban
      </button>
      <button
        onClick={() => onChange("table")}
        className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition ${
          view === "table" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
        }`}
      >
        <List size={14} />
        Lista
      </button>
    </div>
  );
}

"use client";

import { useState } from "react";
import { DndContext, DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { STAGES } from "@/lib/constants";
import { KanbanColumn } from "./KanbanColumn";
import { updateOpportunityStageAction } from "@/lib/actions/opportunities";
import type { Opportunity } from "@/types/opportunity";

export function KanbanBoard({ opportunities }: { opportunities: Opportunity[] }) {
  const [items, setItems] = useState(opportunities);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const newStage = over.id as string;
    const oppId = active.id as string;
    const current = items.find((o) => o.id === oppId);
    if (!current || current.stage === newStage) return;

    setItems((prev) =>
      prev.map((o) => (o.id === oppId ? { ...o, stage: newStage } : o))
    );

    updateOpportunityStageAction(oppId, newStage).catch(() => {
      // revert in caz de eroare
      setItems((prev) =>
        prev.map((o) => (o.id === oppId ? { ...o, stage: current.stage } : o))
      );
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="flex h-full gap-3 overflow-x-auto px-6 py-4">
        {STAGES.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            opportunities={items.filter((o) => o.stage === stage)}
          />
        ))}
      </div>
    </DndContext>
  );
}

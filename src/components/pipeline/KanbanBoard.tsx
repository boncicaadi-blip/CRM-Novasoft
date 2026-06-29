"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { STAGES } from "@/lib/constants";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { updateOpportunityStageAction } from "@/lib/actions/opportunities";
import type { Opportunity } from "@/types/opportunity";

export function KanbanBoard({
  opportunities,
  stages = STAGES as unknown as string[],
  stageColors,
}: {
  opportunities: Opportunity[];
  /** Ordinea coloanelor - vine din nomenclatoare (sortate dupa `ordine`); fallback la STAGES. */
  stages?: string[];
  stageColors?: Record<string, string>;
}) {
  const router = useRouter();
  // Override optimist: doar id-urile mutate manual, cat timp asteptam
  // confirmarea serverului. Sursa de adevar ramane prop-ul `opportunities`,
  // care se actualizeaza automat la fiecare re-render declansat de
  // router.refresh() - fara nevoie de useEffect/setState sincronizat.
  const [stageOverrides, setStageOverrides] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const items = opportunities.map((o) =>
    stageOverrides[o.id] ? { ...o, stage: stageOverrides[o.id] } : o
  );

  const activeItem = activeId ? items.find((o) => o.id === activeId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const newStage = String(over.id);
    const oppId = String(active.id);
    const current = items.find((o) => o.id === oppId);
    if (!current || current.stage === newStage) return;

    setStageOverrides((prev) => ({ ...prev, [oppId]: newStage }));

    updateOpportunityStageAction(oppId, newStage)
      .then(() => {
        router.refresh();
        // Curatam override-ul - de acum prop-ul `opportunities` (proaspat
        // revalidat) e sursa de adevar pentru acest id.
        setStageOverrides((prev) => {
          const next = { ...prev };
          delete next[oppId];
          return next;
        });
      })
      .catch(() => {
        setStageOverrides((prev) => {
          const next = { ...prev };
          delete next[oppId];
          return next;
        });
      });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex h-full gap-3 overflow-x-auto px-6 py-4">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage}
            stage={stage}
            opportunities={items.filter((o) => o.stage === stage)}
            stageColor={stageColors?.[stage]}
          />
        ))}
      </div>

      {/* DragOverlay randeaza elementul tras intr-un layer separat, deasupra
          tuturor, fara sa blocheze detectarea de coliziune sub cursor -
          fara asta, elementul original (repozitionat cu transform) ramane
          "sub cursor" si poate interfera cu calculul lui `over`. */}
      <DragOverlay>
        {activeItem ? (
          <div className="w-72 rotate-1 opacity-90 shadow-2xl">
            <KanbanCard opportunity={activeItem} dragHandleOnly />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

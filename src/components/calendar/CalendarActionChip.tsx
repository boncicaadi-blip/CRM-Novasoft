"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { CalendarAction } from "@/lib/analytics";

export function CalendarActionChip({
  action,
  color,
  onClick,
}: {
  action: CalendarAction;
  color: string;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: action.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    // Cat dureaza drag-ul, originalul devine invizibil - DragOverlay arata
    // versiunea "vie", repozitionata liber, fara sa stea in calea
    // detectarii coliziunii pentru `over`.
    opacity: isDragging ? 0 : 1,
    backgroundColor: color,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) onClick();
      }}
      title={`${action.numePotential} | ${action.actiune ?? ""}`}
      className="cursor-grab truncate rounded px-1 py-0.5 text-[10px] font-medium text-text-primary active:cursor-grabbing"
    >
      {action.numePotential}
    </div>
  );
}

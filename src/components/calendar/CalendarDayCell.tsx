"use client";

import { useDroppable } from "@dnd-kit/core";
import { format, isSameMonth, isSameDay } from "date-fns";
import type { CalendarAction } from "@/lib/analytics";
import { CalendarActionChip } from "./CalendarActionChip";

const MAX_VISIBLE = 3;

export function CalendarDayCell({
  day,
  currentMonth,
  actions,
  colorFor,
  onOpenDay,
  onOpenAction,
}: {
  day: Date;
  currentMonth: Date;
  actions: CalendarAction[];
  colorFor: (action: CalendarAction) => string;
  onOpenDay: (dateStr: string) => void;
  onOpenAction: (action: CalendarAction) => void;
}) {
  const dayStr = format(day, "yyyy-MM-dd");
  const { setNodeRef, isOver } = useDroppable({ id: `day:${dayStr}` });
  const isCurrentMonth = isSameMonth(day, currentMonth);
  const isToday = isSameDay(day, new Date());

  return (
    <div
      ref={setNodeRef}
      onClick={() => onOpenDay(dayStr)}
      className={`flex min-h-[56px] flex-col items-stretch border-b border-r border-white/5 p-1 text-left transition last:border-r-0 cursor-pointer sm:min-h-[88px] sm:p-1.5 ${
        isCurrentMonth ? "" : "opacity-30"
      } ${isToday ? "bg-[#E8007A]/[0.06]" : ""} ${
        isOver ? "bg-[#0070F3]/10 ring-1 ring-inset ring-[#0070F3]" : "hover:bg-white/[0.02]"
      }`}
    >
      <span className={`mb-1 text-[11px] sm:text-xs ${isToday ? "font-bold text-[#E8007A]" : "text-slate-400"}`}>
        {format(day, "d")}
      </span>

      {/* Mobil: doar puncte colorate, compact */}
      <div className="flex flex-wrap gap-0.5 sm:hidden">
        {actions.slice(0, 6).map((a) => (
          <span
            key={a.id}
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: colorFor(a) }}
          />
        ))}
      </div>

      {/* Desktop: chip-uri cu text, draggable */}
      <div className="hidden flex-1 space-y-0.5 overflow-hidden sm:block">
        {actions.slice(0, MAX_VISIBLE).map((a) => (
          <CalendarActionChip
            key={a.id}
            action={a}
            color={colorFor(a)}
            onClick={() => onOpenAction(a)}
          />
        ))}
        {actions.length > MAX_VISIBLE && (
          <p className="px-1 text-[10px] text-slate-500">
            +{actions.length - MAX_VISIBLE} mai multe
          </p>
        )}
      </div>
    </div>
  );
}

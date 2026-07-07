"use client";

import { useState, useMemo } from "react";
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
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  format,
} from "date-fns";
import { ro } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CalendarAction } from "@/lib/analytics";
import { STAGE_COLORS } from "@/lib/constants";
import { updateOpportunityActionDateAction } from "@/lib/actions/opportunities";
import { CalendarDayCell } from "./CalendarDayCell";
import { ActionDetailPanel } from "./ActionDetailPanel";
import { DayDetailModal } from "./DayDetailModal";

const STATUS_COLORS: Record<CalendarAction["status"], string> = {
  restanta: "#94A3B8",
  azi: "#F59E0B",
  viitoare: "#0070F3",
  finalizata: "#22C55E",
};

const STATUS_LABELS: Record<CalendarAction["status"], string> = {
  restanta: "Restanta",
  azi: "Azi",
  viitoare: "Viitoare",
  finalizata: "Finalizata",
};

type ColorMode = "status" | "stage";

export function ActionsCalendar({
  actions: baseActions,
  profiles,
}: {
  actions: CalendarAction[];
  profiles: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  // Override optimist doar pentru actiunile mutate manual, cat asteptam
  // confirmarea serverului - sursa de adevar e prop-ul `baseActions`.
  const [dateOverrides, setDateOverrides] = useState<Record<string, string>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [colorMode, setColorMode] = useState<ColorMode>("status");
  const [selectedAction, setSelectedAction] = useState<CalendarAction | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [responsabilFilter, setResponsabilFilter] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const actions = useMemo(() => {
    const withOverrides = baseActions.map((a) =>
      dateOverrides[a.id] ? { ...a, date: dateOverrides[a.id] } : a
    );
    if (!responsabilFilter) return withOverrides;
    return withOverrides.filter((a) => a.responsabilActiuneId === responsabilFilter);
  }, [baseActions, dateOverrides, responsabilFilter]);

  const activeAction = activeId ? actions.find((a) => a.id === activeId) ?? null : null;

  const actionsByDay = useMemo(() => {
    const map = new Map<string, CalendarAction[]>();
    for (const a of actions) {
      const list = map.get(a.date) ?? [];
      list.push(a);
      map.set(a.date, list);
    }
    return map;
  }, [actions]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    const result: Date[] = [];
    let day = start;
    while (day <= end) {
      result.push(day);
      day = addDays(day, 1);
    }
    return result;
  }, [currentMonth]);

  const weekdayLabels = ["Lun", "Mar", "Mie", "Joi", "Vin", "Sam", "Dum"];

  function colorFor(action: CalendarAction) {
    return colorMode === "status"
      ? STATUS_COLORS[action.status]
      : STAGE_COLORS[action.stage] ?? "#94A3B8";
  }

  function clearOverride(actionId: string) {
    setDateOverrides((prev) => {
      const next = { ...prev };
      delete next[actionId];
      return next;
    });
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const overId = String(over.id);
    if (!overId.startsWith("day:")) return;
    const newDate = overId.replace("day:", "");

    const actionId = String(active.id);
    const current = actions.find((a) => a.id === actionId);
    if (!current || current.date === newDate) return;

    setDateOverrides((prev) => ({ ...prev, [actionId]: newDate }));

    updateOpportunityActionDateAction(actionId, newDate)
      .then(() => {
        router.refresh();
        clearOverride(actionId);
      })
      .catch(() => clearOverride(actionId));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="flex h-full flex-col gap-4 px-3 py-4 sm:px-6 lg:flex-row">
        <div className={`flex-1 transition-all ${selectedAction ? "lg:max-w-[calc(100%-19rem)]" : ""}`}>
          {/* Header navigare */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentMonth((d) => subMonths(d, 1))}
                className="rounded-md border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentMonth((d) => addMonths(d, 1))}
                className="rounded-md border border-white/10 p-1.5 text-slate-400 transition hover:bg-white/5 hover:text-white"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setCurrentMonth(new Date())}
                className="rounded-md border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/5"
              >
                Azi
              </button>
              <h2 className="ml-2 font-heading text-lg text-white">
                {format(currentMonth, "MMMM yyyy", { locale: ro })}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={responsabilFilter}
                onChange={(e) => setResponsabilFilter(e.target.value)}
                className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-white outline-none focus:border-[#E8007A]"
              >
                <option value="" style={{ backgroundColor: "#111535" }}>
                  Toti responsabilii
                </option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id} style={{ backgroundColor: "#111535" }}>
                    {p.full_name}
                  </option>
                ))}
              </select>
              <div className="flex gap-1 rounded-lg bg-white/5 p-1 text-xs">
              <button
                onClick={() => setColorMode("status")}
                className={`rounded-md px-3 py-1.5 transition ${
                  colorMode === "status" ? "bg-white/10 text-white" : "text-slate-500"
                }`}
              >
                Culoare: Status
              </button>
              <button
                onClick={() => setColorMode("stage")}
                className={`rounded-md px-3 py-1.5 transition ${
                  colorMode === "stage" ? "bg-white/10 text-white" : "text-slate-500"
                }`}
              >
                Culoare: Stage
              </button>
              </div>
            </div>
          </div>

          {/* Legenda */}
          <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
            {colorMode === "status"
              ? Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <span key={key} className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: STATUS_COLORS[key as CalendarAction["status"]] }}
                    />
                    {label}
                  </span>
                ))
              : Object.entries(STAGE_COLORS).map(([stage, color]) => (
                  <span key={stage} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                    {stage}
                  </span>
                ))}
          </div>

          <p className="mb-2 text-[11px] text-slate-500">
            Trage o actiune pe alta zi pentru a-i schimba data. Click pe o zi pentru vedere
            detaliata, click pe o actiune pentru detalii in panoul din dreapta.
          </p>

          {/* Grila calendar - ocupa tot spatiul disponibil pe verticala */}
          <div className="flex h-[calc(100%-7rem)] flex-col overflow-hidden rounded-xl border border-white/10">
            <div className="grid grid-cols-7 border-b border-white/10 bg-[#111535]">
              {weekdayLabels.map((d) => (
                <div key={d} className="px-2 py-2 text-center text-xs font-medium text-slate-500">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid flex-1 grid-cols-7 grid-rows-6">
              {days.map((day) => {
                const dayStr = format(day, "yyyy-MM-dd");
                return (
                  <CalendarDayCell
                    key={dayStr}
                    day={day}
                    currentMonth={currentMonth}
                    actions={actionsByDay.get(dayStr) ?? []}
                    colorFor={colorFor}
                    onOpenDay={setOpenDay}
                    onOpenAction={setSelectedAction}
                  />
                );
              })}
            </div>
          </div>
        </div>

        {/* Panou lateral - apare doar cand o actiune e selectata, calendarul se ingusteaza */}
        {selectedAction && (
          <div className="w-full shrink-0 lg:w-72">
            <ActionDetailPanel
              action={selectedAction}
              onClose={() => setSelectedAction(null)}
            />
          </div>
        )}
      </div>

      {openDay && (
        <DayDetailModal
          dateStr={openDay}
          actions={actionsByDay.get(openDay) ?? []}
          onClose={() => setOpenDay(null)}
        />
      )}

      <DragOverlay>
        {activeAction ? (
          <div
            className="rotate-1 truncate rounded px-1.5 py-1 text-[11px] font-medium text-white shadow-2xl"
            style={{ backgroundColor: colorFor(activeAction) }}
          >
            {activeAction.numePotential}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

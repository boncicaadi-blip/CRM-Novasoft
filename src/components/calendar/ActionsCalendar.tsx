"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  format,
} from "date-fns";
import { ro } from "date-fns/locale";
import { ChevronLeft, ChevronRight, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import type { CalendarAction } from "@/lib/analytics";
import { STAGE_COLORS } from "@/lib/constants";

const STATUS_COLORS: Record<CalendarAction["status"], string> = {
  restanta: "#94A3B8",
  viitoare: "#0070F3",
  finalizata: "#22C55E",
};

const STATUS_LABELS: Record<CalendarAction["status"], string> = {
  restanta: "Restanta",
  viitoare: "Viitoare",
  finalizata: "Finalizata",
};

/** Parseaza un string "YYYY-MM-DD" ca data locala, fara conversie UTC care ar putea schimba ziua. */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

type ColorMode = "status" | "stage";

export function ActionsCalendar({ actions }: { actions: CalendarAction[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [colorMode, setColorMode] = useState<ColorMode>("status");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

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

  const selectedActions = selectedDay ? actionsByDay.get(selectedDay) ?? [] : [];

  return (
    <div className="flex h-full flex-col gap-4 px-6 py-4 lg:flex-row">
      <div className="flex-1">
        {/* Header navigare */}
        <div className="mb-4 flex items-center justify-between">
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

        {/* Legenda */}
        <div className="mb-3 flex items-center gap-4 text-xs text-slate-400">
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

        {/* Grila calendar */}
        <div className="overflow-hidden rounded-xl border border-white/10">
          <div className="grid grid-cols-7 border-b border-white/10 bg-[#111535]">
            {weekdayLabels.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-xs font-medium text-slate-500">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayStr = format(day, "yyyy-MM-dd");
              const dayActions = actionsByDay.get(dayStr) ?? [];
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isToday = isSameDay(day, new Date());
              const isSelected = selectedDay === dayStr;

              return (
                <button
                  key={dayStr}
                  onClick={() => setSelectedDay(dayActions.length > 0 ? dayStr : null)}
                  className={`flex min-h-[88px] flex-col items-stretch border-b border-r border-white/5 p-1.5 text-left transition last:border-r-0 ${
                    isCurrentMonth ? "" : "opacity-30"
                  } ${isToday ? "bg-[#E8007A]/[0.06]" : ""} ${
                    isSelected ? "ring-1 ring-inset ring-[#E8007A]" : "hover:bg-white/[0.02]"
                  }`}
                >
                  <span
                    className={`mb-1 text-xs ${
                      isToday ? "font-bold text-[#E8007A]" : "text-slate-400"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                  <div className="flex-1 space-y-0.5 overflow-hidden">
                    {dayActions.slice(0, 3).map((a) => (
                      <div
                        key={a.id}
                        className="truncate rounded px-1 py-0.5 text-[10px] font-medium text-white"
                        style={{
                          backgroundColor:
                            colorMode === "status"
                              ? STATUS_COLORS[a.status]
                              : STAGE_COLORS[a.stage] ?? "#94A3B8",
                        }}
                        title={`${a.numePotential} | ${a.actiune ?? ""}`}
                      >
                        {a.numePotential}
                      </div>
                    ))}
                    {dayActions.length > 3 && (
                      <p className="px-1 text-[10px] text-slate-500">
                        +{dayActions.length - 3} mai multe
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Panou lateral cu detalii ziua selectata */}
      <div className="w-full shrink-0 lg:w-72">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="mb-3 text-sm font-medium text-white">
            {selectedDay
              ? format(parseLocalDate(selectedDay), "d MMMM yyyy", { locale: ro })
              : "Selecteaza o zi"}
          </p>
          {selectedActions.length === 0 ? (
            <p className="text-xs text-slate-500">
              {selectedDay ? "Nicio actiune in aceasta zi." : "Click pe o zi cu actiuni pentru detalii."}
            </p>
          ) : (
            <div className="space-y-2">
              {selectedActions.map((a) => (
                <Link
                  key={a.id}
                  href={`/oportunitati/${a.opportunityId}`}
                  className="block rounded-lg border border-white/5 bg-white/[0.02] p-2.5 transition hover:border-white/20"
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    <StatusIcon status={a.status} />
                    <span className="text-sm text-white">{a.numePotential}</span>
                  </div>
                  <p className="text-xs text-slate-400">{a.actiune ?? "—"}</p>
                  <span
                    className="mt-1 inline-block rounded-full px-1.5 py-0.5 text-[10px]"
                    style={{
                      backgroundColor: `${STAGE_COLORS[a.stage]}20`,
                      color: STAGE_COLORS[a.stage],
                    }}
                  >
                    {a.stage}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: CalendarAction["status"] }) {
  if (status === "finalizata") return <CheckCircle2 size={13} className="text-green-400" />;
  if (status === "restanta") return <AlertCircle size={13} className="text-slate-400" />;
  return <Clock size={13} className="text-[#0070F3]" />;
}

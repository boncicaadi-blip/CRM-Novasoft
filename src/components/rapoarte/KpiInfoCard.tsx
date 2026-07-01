"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { Info, ArrowUp, ArrowDown } from "lucide-react";
import type { KpiDefinition } from "@/lib/kpi-definitions";

export function KpiInfoCard({
  label,
  value,
  sublabel,
  icon,
  accent = "#E8007A",
  definition,
  trend,
  insufficientData,
}: {
  label: string;
  value: string;
  sublabel?: string;
  icon?: ReactNode;
  accent?: string;
  definition: KpiDefinition;
  /** Pentru cardurile de Delta: sens vizual al variatiei. */
  trend?: "up" | "down" | "flat";
  /** Cand nu exista suficient istoric pentru un delta corect. */
  insufficientData?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const trendColor = trend === "up" ? "#22C55E" : trend === "down" ? "#EF4444" : "#94A3B8";

  return (
    <div ref={ref} className="relative rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1 text-xs text-slate-500">{label}</p>
        <div className="flex items-center gap-1.5">
          {icon && (
            <span style={{ color: accent }} className="opacity-70">
              {icon}
            </span>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-full p-0.5 text-slate-600 transition hover:bg-white/10 hover:text-slate-300"
            title="Ce inseamna acest KPI"
          >
            <Info size={13} />
          </button>
        </div>
      </div>

      {insufficientData ? (
        <p className="font-mono text-lg text-slate-600">Date insuficiente</p>
      ) : (
        <div className="flex items-baseline gap-1.5">
          <p className="font-mono text-2xl font-medium text-white">{value}</p>
          {trend && trend !== "flat" && (
            <span style={{ color: trendColor }}>
              {trend === "up" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
            </span>
          )}
        </div>
      )}
      {sublabel && <p className="mt-1 text-[11px] text-slate-500">{sublabel}</p>}

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-lg border border-white/10 bg-[#111535] p-3 text-left shadow-xl">
          <p className="mb-1.5 text-xs font-medium text-white">{label}</p>
          <p className="mb-2 text-[11px] leading-relaxed text-slate-300">{definition.descriere}</p>
          {definition.formula && (
            <p className="mb-2 rounded-md bg-white/5 px-2 py-1.5 font-mono text-[10px] text-slate-400">
              {definition.formula}
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-slate-400">
            <span className="font-medium text-slate-300">Cum il analizezi: </span>
            {definition.cumAnalizezi}
          </p>
        </div>
      )}
    </div>
  );
}

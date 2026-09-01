"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { Info, ArrowUp, ArrowDown } from "lucide-react";
import type { KpiDefinition } from "@/lib/kpi-definitions";

export function KpiInfoCard({
  label,
  value,
  valueColor,
  sublabel,
  icon,
  accent = "#E8007A",
  definition,
  trend,
  insufficientData,
  onClick,
  isActive,
}: {
  label: string;
  value: string;
  /** Culoare optionala pentru valoare (ex: rosu/verde pentru profit negativ/pozitiv). Implicit ramane text-primary. */
  valueColor?: string;
  sublabel?: string;
  icon?: ReactNode;
  accent?: string;
  definition: KpiDefinition;
  /** Pentru cardurile de Delta: sens vizual al variatiei. */
  trend?: "up" | "down" | "flat";
  /** Cand nu exista suficient istoric pentru un delta corect. */
  insufficientData?: boolean;
  /** Daca e dat, cardul devine clicabil (ex: pentru un desfasurator dedesubt). */
  onClick?: () => void;
  isActive?: boolean;
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

  const trendColor = trend === "up" ? "#22C55E" : trend === "down" ? "#EF4444" : "var(--text-secondary)";

  return (
    <div
      ref={ref}
      onClick={onClick}
      className={`relative rounded-xl border p-4 transition ${
        isActive ? "border-[#E8007A] bg-[#E8007A]/5" : "border-border-subtle bg-surface-1"
      } ${onClick ? "cursor-pointer hover:border-border-strong" : ""}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1 text-xs text-text-muted">{label}</p>
        <div className="flex items-center gap-1.5">
          {icon && (
            <span style={{ color: accent }} className="opacity-70">
              {icon}
            </span>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
            className="rounded-full p-0.5 text-text-faint transition hover:bg-surface-2 hover:text-text-primary"
            title="Ce inseamna acest KPI"
          >
            <Info size={13} />
          </button>
        </div>
      </div>

      {insufficientData ? (
        <p className="font-mono text-lg text-text-faint">Date insuficiente</p>
      ) : (
        <div className="flex items-baseline gap-1.5">
          <p className="font-mono text-2xl font-medium text-text-primary" style={valueColor ? { color: valueColor } : undefined}>
            {value}
          </p>
          {trend && trend !== "flat" && (
            <span
              className="flex items-center justify-center rounded-full p-1"
              style={{ backgroundColor: `${trendColor}20`, color: trendColor }}
            >
              {trend === "up" ? <ArrowUp size={22} strokeWidth={3} /> : <ArrowDown size={22} strokeWidth={3} />}
            </span>
          )}
        </div>
      )}
      {sublabel && <p className="mt-1 text-[11px] text-text-muted">{sublabel}</p>}

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-lg border border-border-subtle bg-surface-1 p-3 text-left shadow-xl">
          <p className="mb-1.5 text-xs font-medium text-text-primary">{label}</p>
          <p className="mb-2 text-[11px] leading-relaxed text-text-primary">{definition.descriere}</p>
          {definition.formula && (
            <p className="mb-2 rounded-md bg-surface-1 px-2 py-1.5 font-mono text-[10px] text-text-secondary">
              {definition.formula}
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-text-secondary">
            <span className="font-medium text-text-primary">Cum il analizezi: </span>
            {definition.cumAnalizezi}
          </p>
        </div>
      )}
    </div>
  );
}

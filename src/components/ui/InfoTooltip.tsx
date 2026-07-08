"use client";

import { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";
import type { KpiDefinition } from "@/lib/kpi-definitions";

/**
 * Buton mic "i" cu popover de definitie - versiune independenta a
 * tooltip-ului din KpiInfoCard, gandita sa fie pusa langa titlul oricarui
 * grafic, nu doar pe un card de tip KPI.
 */
export function InfoTooltip({ title, definition }: { title: string; definition: KpiDefinition }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="rounded-full p-0.5 text-text-faint transition hover:bg-surface-2 hover:text-text-primary"
        title="Ce inseamna acest grafic"
      >
        <Info size={13} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-lg border border-border-subtle bg-surface-1 p-3 text-left shadow-xl">
          <p className="mb-1.5 text-xs font-medium text-text-primary">{title}</p>
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

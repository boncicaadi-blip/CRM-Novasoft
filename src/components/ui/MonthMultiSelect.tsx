"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";

/** Genereaza ultimele `count` luni (inclusiv luna curenta), ca optiuni
 * {value: "YYYY-MM", label: "iulie 2026"}. */
export function buildMonthOptions(count = 24): { value: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
    return { value, label };
  });
}

/**
 * Selector de multi-luni - pentru perioada "personalizata", permite alegerea
 * mai multor luni deodata (chiar neconsecutive, ex. mai + august), nu doar
 * un interval continuu. Selectia se foloseste ca `customRange.months` in
 * dateMatchesPeriod.
 */
export function MonthMultiSelect({
  selected,
  onChange,
  monthsBack = 24,
}: {
  selected: string[];
  onChange: (months: string[]) => void;
  monthsBack?: number;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const options = buildMonthOptions(monthsBack);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  const buttonLabel =
    selected.length === 0
      ? "Alege luni..."
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${selected.length} luni selectate`;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition ${
          selected.length > 0
            ? "border-[#E8007A]/40 bg-[#E8007A]/10 text-text-primary"
            : "border-border-subtle bg-surface-2 text-text-primary hover:bg-surface-2"
        }`}
      >
        {buttonLabel}
        <ChevronDown size={13} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 max-h-72 w-56 overflow-y-auto rounded-lg border border-border-subtle bg-surface-1 p-1.5 shadow-xl">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="mb-1 flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-text-secondary transition hover:bg-surface-1"
            >
              <X size={12} />
              Sterge selectia
            </button>
          )}
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm capitalize text-text-primary transition hover:bg-surface-1"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="accent-[#E8007A]"
              />
              {opt.label}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

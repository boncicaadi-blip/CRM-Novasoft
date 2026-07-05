"use client";

import { useRef } from "react";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import type { SortDir } from "@/lib/useTableSort";

/**
 * Antet de tabel (th) sortabil (click pe text) si redimensionabil (tras de
 * marginea din dreapta) - gandit sa inlocuiasca un <th> obisnuit fara sa
 * schimbe restul tabelului. Latimea se gestioneaza in componenta parinte
 * (un simplu Record<string, number>), aici doar raportam noua latime.
 */
export function SortableTh({
  label,
  sortKey,
  currentSortKey,
  sortDir,
  onSort,
  width,
  onResize,
  align = "left",
  className = "",
}: {
  label: string;
  sortKey?: string;
  currentSortKey: string | null;
  sortDir: SortDir;
  onSort?: (key: string) => void;
  width?: number;
  onResize?: (width: number) => void;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  const thRef = useRef<HTMLTableCellElement>(null);

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = thRef.current?.offsetWidth ?? 120;

    function onMove(ev: MouseEvent) {
      const newWidth = Math.max(60, startWidth + (ev.clientX - startX));
      onResize?.(newWidth);
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const isSorted = sortKey && currentSortKey === sortKey;
  const alignClass = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";

  return (
    <th
      ref={thRef}
      style={width ? { width, minWidth: width, maxWidth: width } : undefined}
      className={`relative select-none px-3 py-2 ${className}`}
    >
      {sortKey && onSort ? (
        <button
          onClick={() => onSort(sortKey)}
          className={`flex w-full items-center gap-1 ${alignClass} text-left transition hover:text-white`}
        >
          {label}
          {isSorted ? (
            sortDir === "asc" ? (
              <ChevronUp size={12} />
            ) : (
              <ChevronDown size={12} />
            )
          ) : (
            <ChevronsUpDown size={11} className="opacity-30" />
          )}
        </button>
      ) : (
        <span className={`flex w-full ${alignClass}`}>{label}</span>
      )}
      {onResize && (
        <div
          onMouseDown={startResize}
          className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-[#E8007A]/40"
        />
      )}
    </th>
  );
}

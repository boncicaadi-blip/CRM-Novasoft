"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";

/**
 * Infasoara orice grafic (sau card cu grafic) si adauga un buton de marire
 * (colt dreapta-sus, apare la hover) care il afiseaza pe tot ecranul, marit
 * proportional - ca in Power BI. Functioneaza cu ORICE continut, fara sa
 * ceara modificari in componenta de grafic infasurata (scaleaza vizual prin
 * CSS transform, nu recalculeaza dimensiunile interne ale graficului).
 */
export function ExpandableChart({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const scaleX = (window.innerWidth * 0.9) / rect.width;
    const scaleY = (window.innerHeight * 0.85) / rect.height;
    setScale(Math.min(scaleX, scaleY, 2.5));
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  return (
    <div className="group relative">
      <button
        onClick={() => setExpanded(true)}
        title="Mareste graficul"
        className="absolute right-2 top-2 z-10 rounded-md bg-black/30 p-1.5 text-slate-300 opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-black/50 hover:text-white"
      >
        <Maximize2 size={14} />
      </button>
      <div ref={containerRef}>{children}</div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-8"
          onClick={() => setExpanded(false)}
        >
          <button
            onClick={() => setExpanded(false)}
            title="Inchide (Esc)"
            className="absolute right-4 top-4 rounded-md border border-white/10 bg-white/10 p-2 text-white transition hover:bg-white/20"
          >
            <X size={20} />
          </button>
          <div onClick={(e) => e.stopPropagation()} style={{ transform: `scale(${scale})` }}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

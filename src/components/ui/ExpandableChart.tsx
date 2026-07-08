"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";

/**
 * Infasoara orice grafic (sau card cu grafic) si adauga un buton de marire
 * (colt dreapta-sus, apare la hover) care il afiseaza pe tot ecranul, marit
 * proportional - ca in Power BI. Functioneaza cu ORICE continut, fara sa
 * ceara modificari in componenta de grafic infasurata (scaleaza vizual prin
 * CSS transform, nu recalculeaza dimensiunile interne). Fiindca graficele
 * Recharts sunt SVG (vectoriale), scalarea ramane perfect clara la orice
 * marime - nu se pixeleaza precum o imagine.
 *
 * Recalculeaza scara si la redimensionarea ferestrei cat timp e deschis, ca
 * sa ramana corect si daca utilizatorul schimba marimea ferestrei browser-ului.
 */
export function ExpandableChart({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [scale, setScale] = useState(1);
  const [grown, setGrown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded || !containerRef.current) return;

    function recalcScale() {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const maxWidth = window.innerWidth * 0.94;
      const maxHeight = window.innerHeight * 0.88;
      setScale(Math.min(maxWidth / rect.width, maxHeight / rect.height, 3.5));
    }

    recalcScale();
    // Dublu rAF: primul frame se picteaza la scara 1 (grown=false), apoi
    // tranzitia CSS anima spre scara calculata - efect de "crestere" placut,
    // ca in Power BI, in loc sa apara brusc la marimea finala.
    const grow = requestAnimationFrame(() => requestAnimationFrame(() => setGrown(true)));
    window.addEventListener("resize", recalcScale);
    return () => {
      window.removeEventListener("resize", recalcScale);
      cancelAnimationFrame(grow);
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setExpanded(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  function close() {
    setGrown(false);
    setExpanded(false);
  }

  return (
    <div className="group relative">
      <button
        onClick={() => setExpanded(true)}
        title="Mareste graficul"
        className="absolute right-2 top-2 z-10 rounded-md bg-black/30 p-1.5 text-text-primary opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-black/50 hover:text-text-primary"
      >
        <Maximize2 size={14} />
      </button>
      <div ref={containerRef}>{children}</div>

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
          onClick={close}
        >
          <button
            onClick={close}
            title="Inchide (Esc)"
            className="absolute right-5 top-5 rounded-md border border-border-subtle bg-surface-2 p-2 text-text-primary shadow-lg transition hover:bg-surface-1"
          >
            <X size={20} />
          </button>
          <p className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 text-xs text-white/50">
            Esc sau click in afara pentru a inchide
          </p>
          <div
            onClick={(e) => e.stopPropagation()}
            className="origin-center transition-transform duration-200 ease-out"
            style={{ transform: `scale(${grown ? scale : 1})` }}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

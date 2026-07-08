"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Maximize2, X } from "lucide-react";

/**
 * Buton de marire (colt dreapta-sus, apare la hover) care deschide graficul
 * intr-o fereastra mare, aproape pe tot ecranul - ca in Power BI.
 *
 * Fereastra se randeaza printr-un portal direct in <body>, complet separat
 * de locul unde e definit graficul in pagina - asta il fereste de orice ar
 * putea sa-i strice pozitionarea (scroll, alti parinti, drag-and-drop etc).
 *
 * Marirea NU se face prin scalare vizuala (CSS transform), care depindea de
 * masuratori JS fragile si nu dadea rezultate consistente. In schimb, cardul
 * primeste pur si simplu o latime si inaltime mari prin CSS, iar clasa
 * "chart-expanded-modal" (definita in globals.css) forteaza graficele
 * Recharts din interior sa fie si ele mai inalte - Recharts detecteaza
 * singur noua marime (prin ResizeObserver intern) si redeseneaza graficul
 * la marimea corecta, nu doar il mareste vizual ca pe o poza.
 */
export function ExpandableChart({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Portalul (createPortal) are nevoie de document.body, care nu exista pe
  // server - "mounted" devine true abia dupa montare in client.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- vezi comentariul de mai sus
  useEffect(() => setMounted(true), []);

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
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(true);
        }}
        title="Mareste graficul"
        className="absolute right-2 top-2 z-20 rounded-md bg-black/30 p-1.5 text-text-primary opacity-0 backdrop-blur-sm transition group-hover:opacity-100 hover:bg-black/50 hover:text-text-primary"
      >
        <Maximize2 size={14} />
      </button>
      {children}

      {mounted &&
        expanded &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
            onClick={() => setExpanded(false)}
          >
            <button
              onClick={() => setExpanded(false)}
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
              className="chart-expanded-modal max-h-[88vh] w-[94vw] max-w-[1500px] overflow-auto"
            >
              {children}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

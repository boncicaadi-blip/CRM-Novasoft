"use client";

import { useEffect, useMemo, useState } from "react";
import { geoMercator, geoPath } from "d3-geo";
import { formatEur } from "@/lib/format";
import { normalizeJudetName } from "@/lib/geo";
import type { JudetMapDatum } from "@/lib/analytics";
import type { FeatureCollection, Geometry } from "geojson";

const WIDTH = 600;
const HEIGHT = 420;

interface JudetFeatureProps {
  name: string;
}

/** Culorile hartii sunt calculate direct in JS (interpolare RGB, nu clase
 * Tailwind), deci nu se adapteaza singure la tema - citim tema curenta din
 * clasa de pe <html>, ca sa alegem paleta corecta. */
function useIsLightTheme(): boolean {
  const [isLight, setIsLight] = useState(false);
  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains("light"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return isLight;
}

export function RomaniaMap({
  geoData,
  data,
  metric,
  selectedJudete,
  onSelectionChange,
}: {
  geoData: FeatureCollection<Geometry, JudetFeatureProps>;
  data: JudetMapDatum[];
  metric: "count" | "arr";
  selectedJudete: string[];
  onSelectionChange: (judete: string[]) => void;
}) {
  const isLight = useIsLightTheme();
  const [hovered, setHovered] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const dataByJudet = useMemo(() => {
    const map = new Map<string, JudetMapDatum>();
    for (const d of data) {
      map.set(normalizeJudetName(d.judet), d);
    }
    return map;
  }, [data]);

  const maxValue = useMemo(() => {
    return Math.max(1, ...data.map((d) => (metric === "count" ? d.count : d.arr)));
  }, [data, metric]);

  const projection = useMemo(
    () =>
      geoMercator().fitSize(
        [WIDTH, HEIGHT],
        geoData as unknown as Parameters<ReturnType<typeof geoMercator>["fitSize"]>[1]
      ),
    [geoData]
  );

  const pathGenerator = useMemo(() => geoPath(projection), [projection]);
  const selectedNormalized = useMemo(
    () => new Set(selectedJudete.map(normalizeJudetName)),
    [selectedJudete]
  );

  function colorFor(judetName: string): string {
    const datum = dataByJudet.get(normalizeJudetName(judetName));
    if (!datum) return isLight ? "#e2e8f0" : "#1A2050"; // judet fara oportunitati - neutru, adaptat la tema
    const value = metric === "count" ? datum.count : datum.arr;
    const intensity = Math.min(1, value / maxValue);
    // Interpolam intre culoarea de "baza" (slaba, adaptata la tema) si
    // magenta (intens) - baza e navy inchis pe tema dark, gri deschis pe
    // tema light, ca gradientul sa aiba sens pe orice fundal.
    const base = isLight ? { r: 226, g: 232, b: 240 } : { r: 17, g: 21, b: 53 };
    const r = Math.round(base.r + (232 - base.r) * intensity);
    const g = Math.round(base.g + (0 - base.g) * intensity);
    const b = Math.round(base.b + (122 - base.b) * intensity);
    return `rgb(${r},${g},${b})`;
  }

  function handleJudetClick(name: string, e: React.MouseEvent) {
    const isMulti = e.ctrlKey || e.metaKey;
    const isSelected = selectedNormalized.has(normalizeJudetName(name));

    if (isMulti) {
      if (isSelected) {
        onSelectionChange(selectedJudete.filter((j) => normalizeJudetName(j) !== normalizeJudetName(name)));
      } else {
        onSelectionChange([...selectedJudete, name]);
      }
    } else {
      // Click simplu: daca era deja unica selectie, deselecteaza; altfel selecteaza doar acesta.
      if (isSelected && selectedJudete.length === 1) {
        onSelectionChange([]);
      } else {
        onSelectionChange([name]);
      }
    }
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  const hoveredDatum = hovered ? dataByJudet.get(normalizeJudetName(hovered)) : null;

  return (
    <div className="relative">
      <p className="mb-2 text-[11px] text-text-muted">
        Click pentru a selecta un judet. Ctrl/Cmd+Click pentru selectie multipla.
      </p>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mx-auto w-full"
        style={{ maxHeight: "60vh" }}
        role="img"
        aria-label="Harta Romaniei cu oportunitati pe judet"
        onMouseMove={handleMouseMove}
      >
        {geoData.features.map((feature) => {
          const name = feature.properties.name;
          const path = pathGenerator(feature) ?? "";
          const isHovered = hovered === name;
          const isSelected = selectedNormalized.has(normalizeJudetName(name));
          return (
            <path
              key={name}
              d={path}
              fill={colorFor(name)}
              stroke={isSelected ? "#E8007A" : isHovered ? "#FF4FAA" : isLight ? "#f8fafc" : "#0B0D1A"}
              strokeWidth={isSelected ? 2.5 : isHovered ? 1.5 : 0.75}
              onMouseEnter={() => setHovered(name)}
              onMouseLeave={() => setHovered(null)}
              onClick={(e) => handleJudetClick(name, e)}
              className="cursor-pointer transition-colors"
            />
          );
        })}
      </svg>

      {hovered && mousePos && (
        <div
          className="pointer-events-none absolute rounded-lg border border-border-strong bg-surface-1 px-3 py-2 text-xs shadow-xl"
          style={{
            left: Math.min(mousePos.x + 12, 400),
            top: Math.max(mousePos.y - 50, 0),
          }}
        >
          <p className="mb-1 font-medium text-text-primary">{hovered}</p>
          {hoveredDatum ? (
            <>
              <p className="text-text-secondary">
                Oportunitati: <span className="text-text-primary">{hoveredDatum.count}</span>
              </p>
              <p className="text-text-secondary">
                ARR: <span className="font-mono text-[#E8007A]">{formatEur(hoveredDatum.arr)}</span>
              </p>
            </>
          ) : (
            <p className="text-text-muted">Nicio oportunitate</p>
          )}
        </div>
      )}
    </div>
  );
}

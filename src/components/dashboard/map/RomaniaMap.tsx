"use client";

import { useMemo, useState } from "react";
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
  const [hovered, setHovered] = useState<string | null>(null);

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
    if (!datum) return "#1A2050"; // judet fara oportunitati - gri-indigo neutru
    const value = metric === "count" ? datum.count : datum.arr;
    const intensity = Math.min(1, value / maxValue);
    // Interpolam intre culoarea de card (slab) si magenta (intens)
    const r = Math.round(17 + (232 - 17) * intensity);
    const g = Math.round(21 + (0 - 21) * intensity);
    const b = Math.round(53 + (122 - 53) * intensity);
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

  const hoveredDatum = hovered ? dataByJudet.get(normalizeJudetName(hovered)) : null;

  return (
    <div className="relative">
      <p className="mb-2 text-[11px] text-slate-500">
        Click pentru a selecta un judet. Ctrl/Cmd+Click pentru selectie multipla.
      </p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Harta Romaniei cu oportunitati pe judet">
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
              stroke={isSelected ? "#E8007A" : isHovered ? "#FF4FAA" : "#0B0D1A"}
              strokeWidth={isSelected ? 2.5 : isHovered ? 1.5 : 0.75}
              onMouseEnter={() => setHovered(name)}
              onMouseLeave={() => setHovered(null)}
              onClick={(e) => handleJudetClick(name, e)}
              className="cursor-pointer transition-colors"
            />
          );
        })}
      </svg>

      {hoveredDatum && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/20 bg-[#111535] px-3 py-2 text-xs shadow-xl">
          <p className="mb-1 font-medium text-white">{hoveredDatum.judet}</p>
          <p className="text-slate-400">
            Oportunitati: <span className="text-slate-200">{hoveredDatum.count}</span>
          </p>
          <p className="text-slate-400">
            ARR: <span className="font-mono text-[#E8007A]">{formatEur(hoveredDatum.arr)}</span>
          </p>
        </div>
      )}
      {hovered && !hoveredDatum && (
        <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/20 bg-[#111535] px-3 py-2 text-xs shadow-xl">
          <p className="font-medium text-white">{hovered}</p>
          <p className="text-slate-500">Nicio oportunitate</p>
        </div>
      )}
    </div>
  );
}

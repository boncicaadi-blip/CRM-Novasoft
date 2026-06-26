"use client";

import { useState } from "react";
import { formatEur } from "@/lib/format";
import { RomaniaMap } from "./RomaniaMap";
import type { JudetMapDatum } from "@/lib/analytics";
import type { FeatureCollection, Geometry } from "geojson";

export function MapDashboardClient({
  geoData,
  data,
}: {
  geoData: FeatureCollection<Geometry, { name: string }>;
  data: JudetMapDatum[];
}) {
  const [metric, setMetric] = useState<"count" | "arr">("count");

  const sorted = [...data].sort((a, b) =>
    metric === "count" ? b.count - a.count : b.arr - a.arr
  );

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-heading text-white">Oportunitati pe harta</h1>
          <p className="text-sm text-slate-500">Distributie geografica pe judete, Romania</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-white/5 p-1 text-xs">
          <button
            onClick={() => setMetric("count")}
            className={`rounded-md px-3 py-1.5 transition ${
              metric === "count" ? "bg-white/10 text-white" : "text-slate-500"
            }`}
          >
            Nr. oportunitati
          </button>
          <button
            onClick={() => setMetric("arr")}
            className={`rounded-md px-3 py-1.5 transition ${
              metric === "arr" ? "bg-white/10 text-white" : "text-slate-500"
            }`}
          >
            ARR
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 lg:col-span-2">
          <RomaniaMap geoData={geoData} data={data} metric={metric} />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="mb-3 text-sm font-medium text-white">Top judete</p>
          <div className="space-y-2">
            {sorted.slice(0, 12).map((d) => (
              <div key={d.judet} className="flex items-center justify-between text-sm">
                <span className="text-slate-300">{d.judet}</span>
                <span className="font-mono text-xs text-slate-400">
                  {metric === "count" ? `${d.count} oport.` : formatEur(d.arr)}
                </span>
              </div>
            ))}
            {sorted.length === 0 && (
              <p className="text-xs text-slate-500">Nicio oportunitate cu judet completat.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

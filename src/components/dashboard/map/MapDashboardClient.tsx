"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { formatEur } from "@/lib/format";
import { normalizeJudetName } from "@/lib/geo";
import { STAGE_COLORS } from "@/lib/constants";
import { groupByJudetFull } from "@/lib/analytics";
import { PipelineFilters } from "@/components/pipeline/PipelineFilters";
import { RomaniaMap } from "./RomaniaMap";
import type { Opportunity } from "@/types/opportunity";
import type { FeatureCollection, Geometry } from "geojson";

export function MapDashboardClient({
  geoData,
  opportunities,
}: {
  geoData: FeatureCollection<Geometry, { name: string }>;
  opportunities: Opportunity[];
}) {
  const [metric, setMetric] = useState<"count" | "arr">("count");
  const [selectedJudete, setSelectedJudete] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const stagesInData = useMemo(
    () => Array.from(new Set(opportunities.map((o) => o.stage))),
    [opportunities]
  );
  const statuses = useMemo(
    () => Array.from(new Set(opportunities.map((o) => o.status))),
    [opportunities]
  );

  const filteredOpportunities = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = opportunities;
    if (q) {
      rows = rows.filter(
        (o) =>
          o.nume_potential.toLowerCase().includes(q) ||
          o.nume_grup.toLowerCase().includes(q) ||
          (o.judet ?? "").toLowerCase().includes(q) ||
          (o.cod_fiscal ?? "").toLowerCase().includes(q)
      );
    }
    if (stageFilter.length > 0) {
      rows = rows.filter((o) => stageFilter.includes(o.stage));
    }
    if (statusFilter.length > 0) {
      rows = rows.filter((o) => statusFilter.includes(o.status));
    }
    return rows;
  }, [opportunities, search, stageFilter, statusFilter]);

  // Recalculam distributia pe judete din oportunitatile filtrate, ca harta
  // si topul de judete sa reflecte exact filtrele active (Stage/Status/cautare).
  const data = useMemo(() => groupByJudetFull(filteredOpportunities), [filteredOpportunities]);

  const sorted = [...data].sort((a, b) =>
    metric === "count" ? b.count - a.count : b.arr - a.arr
  );

  const selectedNormalized = useMemo(
    () => new Set(selectedJudete.map(normalizeJudetName)),
    [selectedJudete]
  );

  const opportunitiesInSelection = useMemo(() => {
    if (selectedJudete.length === 0) return [];
    return filteredOpportunities.filter(
      (o) => o.judet && selectedNormalized.has(normalizeJudetName(o.judet))
    );
  }, [filteredOpportunities, selectedNormalized, selectedJudete]);

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-heading text-text-primary">Oportunitati pe harta</h1>
          <p className="text-sm text-text-muted">Distributie geografica pe judete, Romania</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-surface-1 p-1 text-xs">
          <button
            onClick={() => setMetric("count")}
            className={`rounded-md px-3 py-1.5 transition ${
              metric === "count" ? "bg-surface-2 text-text-primary" : "text-text-muted"
            }`}
          >
            Nr. oportunitati
          </button>
          <button
            onClick={() => setMetric("arr")}
            className={`rounded-md px-3 py-1.5 transition ${
              metric === "arr" ? "bg-surface-2 text-text-primary" : "text-text-muted"
            }`}
          >
            ARR
          </button>
        </div>
      </div>

      <div className="mb-4">
        <PipelineFilters
          search={search}
          onSearchChange={setSearch}
          stageFilter={stageFilter}
          onStageFilterChange={setStageFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          stages={stagesInData}
          statuses={statuses}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <RomaniaMap
            geoData={geoData}
            data={data}
            metric={metric}
            selectedJudete={selectedJudete}
            onSelectionChange={setSelectedJudete}
          />
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-text-primary">
              {selectedJudete.length > 0
                ? `Oportunitati: ${selectedJudete.join(", ")}`
                : "Top judete"}
            </p>
            {selectedJudete.length > 0 && (
              <button
                onClick={() => setSelectedJudete([])}
                className="rounded-md p-1 text-text-muted transition hover:bg-surface-1 hover:text-text-primary"
                title="Sterge selectia"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {selectedJudete.length > 0 ? (
            <div className="max-h-[360px] space-y-1.5 overflow-y-auto">
              {opportunitiesInSelection.map((o) => (
                <Link
                  key={o.id}
                  href={`/oportunitati/${o.id}`}
                  className="block rounded-lg border border-border-faint bg-surface-1 p-2 transition hover:border-border-strong"
                >
                  <p className="truncate text-sm text-text-primary">{o.nume_potential}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span
                      className="rounded-full px-1.5 py-0.5 text-[10px]"
                      style={{
                        backgroundColor: `${STAGE_COLORS[o.stage] ?? "var(--text-secondary)"}20`,
                        color: STAGE_COLORS[o.stage] ?? "var(--text-secondary)",
                      }}
                    >
                      {o.stage}
                    </span>
                    <span className="text-[11px] text-text-muted">{o.judet}</span>
                  </div>
                </Link>
              ))}
              {opportunitiesInSelection.length === 0 && (
                <p className="text-xs text-text-muted">
                  Nicio oportunitate in judetele selectate.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {sorted.slice(0, 12).map((d) => (
                <button
                  key={d.judet}
                  onClick={() => setSelectedJudete([d.judet])}
                  className="flex w-full items-center justify-between rounded-md px-1.5 py-1 text-sm transition hover:bg-surface-1"
                >
                  <span className="text-text-primary">{d.judet}</span>
                  <span className="font-mono text-xs text-text-secondary">
                    {metric === "count" ? `${d.count} oport.` : formatEur(d.arr)}
                  </span>
                </button>
              ))}
              {sorted.length === 0 && (
                <p className="text-xs text-text-muted">Nicio oportunitate cu judet completat.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

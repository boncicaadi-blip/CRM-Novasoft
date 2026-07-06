"use client";

import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { formatEur } from "@/lib/format";
import type { GrupareDatum } from "@/lib/cheltuieli-dashboard-analytics";
import type { KpiDefinition } from "@/lib/kpi-definitions";

/** Top ranked, nu grafic - Clasa cheltuielii are prea multe categorii
 * distincte pentru o placinta (zeci de felii minuscule) sau o bara inalta
 * (lista foarte lunga). Un top simplu ramane lizibil indiferent de cate
 * clase exista - primele 8, plus un rand "Altele" pentru rest. */
export function TopClasaList({
  title,
  data,
  selected,
  onToggle,
  definition,
  topN = 8,
}: {
  title: string;
  data: GrupareDatum[];
  selected: string[];
  onToggle: (cheie: string) => void;
  definition?: KpiDefinition;
  topN?: number;
}) {
  const sorted = [...data].sort((a, b) => b.realizat - a.realizat);
  const top = sorted.slice(0, topN);
  const rest = sorted.slice(topN);
  const totalRest = rest.reduce((s, d) => s + d.realizat, 0);
  const total = sorted.reduce((s, d) => s + d.realizat, 0);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-white">
        {title}
        {definition && <InfoTooltip title={title} definition={definition} />}
      </p>
      <div className="space-y-1.5">
        {top.map((d) => {
          const pct = total > 0 ? Math.round((d.realizat / total) * 100) : 0;
          const isSelected = selected.includes(d.cheie);
          return (
            <button
              key={d.cheie}
              onClick={() => onToggle(d.cheie)}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm transition hover:bg-white/5 ${
                selected.length > 0 && !isSelected ? "opacity-40" : ""
              }`}
            >
              <span className="truncate text-slate-300">{d.cheie}</span>
              <span className="ml-2 shrink-0 font-mono text-xs text-slate-400">
                {formatEur(d.realizat)} <span className="text-slate-600">({pct}%)</span>
              </span>
            </button>
          );
        })}
        {rest.length > 0 && (
          <div className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-slate-500">
            <span>Altele ({rest.length})</span>
            <span className="font-mono text-xs">{formatEur(totalRest)}</span>
          </div>
        )}
        {sorted.length === 0 && <p className="py-4 text-center text-xs text-slate-500">Niciun rezultat.</p>}
      </div>
    </div>
  );
}

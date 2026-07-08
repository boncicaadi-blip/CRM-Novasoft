"use client";

import { useState } from "react";
import { computeOpportunityScore, scoreLevel } from "@/lib/analytics";
import type { Opportunity } from "@/types/opportunity";

/**
 * Badge de scor (B-12) cu tooltip custom (nu title HTML nativ) care arata
 * defalcarea pe criterii la hover, in orice loc unde e folosit (Kanban,
 * tabel, fisa oportunitatii).
 */
export function ScoreBadge({
  o,
  size = "sm",
}: {
  o: Opportunity;
  size?: "sm" | "lg";
}) {
  const [hovered, setHovered] = useState(false);
  const score = computeOpportunityScore(o);
  const level = scoreLevel(score.total);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {size === "sm" ? (
        <span
          className="rounded-full px-2 py-0.5 font-mono text-[11px] font-medium"
          style={{ backgroundColor: `${level.color}20`, color: level.color }}
        >
          {score.total}
        </span>
      ) : (
        <div className="cursor-default rounded-lg border border-border-subtle bg-surface-1 p-3">
          <p className="text-[11px] text-text-muted">Scor oportunitate</p>
          <p className="font-mono text-lg" style={{ color: level.color }}>
            {score.total}
            <span className="text-xs text-text-muted">/100</span>
          </p>
          <p className="text-[10px]" style={{ color: level.color }}>
            {level.label}
          </p>
        </div>
      )}

      {hovered && (
        <div className="absolute left-1/2 top-full z-50 mt-1.5 w-56 -translate-x-1/2 rounded-lg border border-border-strong bg-surface-1 p-2.5 text-left shadow-xl">
          <p className="mb-1.5 text-[11px] font-medium text-text-primary">
            Scor: {score.total}/100 ({level.label})
          </p>
          <div className="space-y-0.5">
            {score.detalii.map((d) => (
              <div key={d.criteriu} className="flex items-center justify-between text-[10px]">
                <span className="text-text-secondary">{d.criteriu}</span>
                <span className={d.puncte > 0 ? "text-text-primary" : "text-text-faint"}>
                  {d.puncte}/{d.maxim}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

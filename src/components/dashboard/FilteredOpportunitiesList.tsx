"use client";

import Link from "next/link";
import { Filter } from "lucide-react";
import { STAGE_COLORS, STATUS_COLORS } from "@/lib/constants";
import { formatEur } from "@/lib/format";
import type { Opportunity } from "@/types/opportunity";

export function FilteredOpportunitiesList({
  opportunities,
  label,
}: {
  opportunities: Opportunity[];
  label: string;
}) {
  return (
    <div className="rounded-xl border border-[#E8007A]/20 bg-[#E8007A]/[0.02] p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <Filter size={14} className="text-[#E8007A]" />
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <span className="ml-auto rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] text-text-secondary">
          {opportunities.length}
        </span>
      </div>

      <div className="max-h-[500px] space-y-1.5 overflow-y-auto pr-1">
        {opportunities.map((o) => {
          const value = (o.forecast_total_saas ?? 0) + (o.forecast_total_onpremise ?? 0);
          return (
            <Link
              key={o.id}
              href={`/oportunitati/${o.id}`}
              className="block rounded-md bg-surface-1 px-2.5 py-2 text-sm transition hover:bg-surface-1"
            >
              <p className="truncate text-text-primary">{o.nume_potential}</p>
              <div className="mt-0.5 flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span
                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px]"
                    style={{
                      backgroundColor: `${STAGE_COLORS[o.stage] ?? "var(--text-secondary)"}20`,
                      color: STAGE_COLORS[o.stage] ?? "var(--text-secondary)",
                    }}
                  >
                    {o.stage}
                  </span>
                  <span
                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px]"
                    style={{
                      backgroundColor: `${STATUS_COLORS[o.status] ?? "var(--text-secondary)"}20`,
                      color: STATUS_COLORS[o.status] ?? "var(--text-secondary)",
                    }}
                  >
                    {o.status}
                  </span>
                </div>
                {value > 0 && (
                  <span className="shrink-0 font-mono text-[11px] text-[#E8007A]">
                    {formatEur(value)}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
        {opportunities.length === 0 && (
          <p className="py-6 text-center text-xs text-text-muted">
            Nicio oportunitate pentru aceasta selectie.
          </p>
        )}
      </div>
    </div>
  );
}

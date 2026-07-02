"use client";

import { formatRon } from "@/lib/format";
import type { ObligatiiSummary } from "@/lib/obligatii-analytics";

const BUCKETS: { key: keyof ObligatiiSummary; label: string; color: string }[] = [
  { key: "sold0_30", label: "0-30 zile", color: "#22C55E" },
  { key: "sold31_60", label: "31-60 zile", color: "#FBBF24" },
  { key: "sold61_90", label: "61-90 zile", color: "#F97316" },
  { key: "sold90Plus", label: "90+ zile", color: "#EF4444" },
];

export function AgingBarObligatii({ summary }: { summary: ObligatiiSummary }) {
  const total = summary.sold0_30 + summary.sold31_60 + summary.sold61_90 + summary.sold90Plus;

  if (total <= 0) return null;

  return (
    <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
        Vechime sold (aging)
      </p>
      <div className="mb-3 flex h-3 w-full overflow-hidden rounded-full bg-white/5">
        {BUCKETS.map((b) => {
          const value = summary[b.key] as number;
          const pct = (value / total) * 100;
          if (pct <= 0) return null;
          return (
            <div
              key={b.key}
              style={{ width: `${pct}%`, backgroundColor: b.color }}
              title={`${b.label}: ${formatRon(value)}`}
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {BUCKETS.map((b) => {
          const value = summary[b.key] as number;
          return (
            <div key={b.key} className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
              <span className="text-slate-400">{b.label}</span>
              <span className="font-mono text-slate-300">{formatRon(value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

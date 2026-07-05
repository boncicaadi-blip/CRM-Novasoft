"use client";

import { formatRon } from "@/lib/format";
import type { ObligatiiSummary, AgingBucketObligatie } from "@/lib/obligatii-analytics";

const BUCKETS: { key: AgingBucketObligatie; label: string; color: string }[] = [
  { key: "sold0_30", label: "0-30 zile", color: "#22C55E" },
  { key: "sold31_60", label: "31-60 zile", color: "#FBBF24" },
  { key: "sold61_90", label: "61-90 zile", color: "#F97316" },
  { key: "sold91_180", label: "91-180 zile", color: "#EF4444" },
  { key: "sold181_365", label: "181-365 zile", color: "#B91C1C" },
  { key: "sold365Plus", label: "peste 365 zile", color: "#7F1D1D" },
];

export function AgingBarObligatii({
  summary,
  activeBucket,
  onBucketClick,
}: {
  summary: ObligatiiSummary;
  activeBucket: AgingBucketObligatie | null;
  onBucketClick: (bucket: AgingBucketObligatie) => void;
}) {
  const total =
    summary.sold0_30 +
    summary.sold31_60 +
    summary.sold61_90 +
    summary.sold91_180 +
    summary.sold181_365 +
    summary.sold365Plus;

  if (total <= 0) return null;

  return (
    <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Vechime sold (aging) — click pentru filtrare
        </p>
        {activeBucket && (
          <button
            onClick={() => onBucketClick(activeBucket)}
            className="text-[11px] text-slate-500 underline hover:text-slate-300"
          >
            Sterge filtrul
          </button>
        )}
      </div>
      <div className="mb-3 flex h-3 w-full overflow-hidden rounded-full bg-white/5">
        {BUCKETS.map((b) => {
          const value = summary[b.key] as number;
          const pct = (value / total) * 100;
          if (pct <= 0) return null;
          const isDimmed = activeBucket !== null && activeBucket !== b.key;
          return (
            <button
              key={b.key}
              onClick={() => onBucketClick(b.key)}
              style={{
                width: `${pct}%`,
                backgroundColor: b.color,
                opacity: isDimmed ? 0.3 : 1,
              }}
              title={`${b.label}: ${formatRon(value)} — click pentru filtrare`}
              className="transition-opacity hover:opacity-80"
            />
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5">
        {BUCKETS.map((b) => {
          const value = summary[b.key] as number;
          const isActive = activeBucket === b.key;
          return (
            <button
              key={b.key}
              onClick={() => onBucketClick(b.key)}
              className={`flex items-center gap-1.5 rounded px-1 text-xs transition ${
                isActive ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.color }} />
              <span className="text-slate-400">{b.label}</span>
              <span className="font-mono text-slate-300">{formatRon(value)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

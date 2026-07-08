"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { OBLIGATII_KPI_DEFINITIONS } from "@/lib/obligatii-kpi-definitions";
import { formatRon, formatRonCompact } from "@/lib/format";
import type { AgingDatum } from "@/lib/obligatii-dashboard-analytics";
import type { AgingBucketObligatie } from "@/lib/obligatii-analytics";

const AGING_COLORS: Record<AgingBucketObligatie, string> = {
  sold0_30: "#22C55E",
  sold31_60: "#FBBF24",
  sold61_90: "#F97316",
  sold91_180: "#EF4444",
  sold181_365: "#B91C1C",
  sold365Plus: "#7F1D1D",
};

export function ObligatiiAgingChart({
  data,
  onToggle,
  selected = [],
}: {
  data: AgingDatum[];
  onToggle?: (bucket: AgingBucketObligatie) => void;
  selected?: AgingBucketObligatie[];
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">Vechime sold restant (aging)<InfoTooltip title="Vechime sold (aging)" definition={OBLIGATII_KPI_DEFINITIONS.agingChart} /></p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            tickFormatter={(v) => formatRonCompact(v)}
          />
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as AgingDatum;
              return (
                <ChartTooltipBox
                  title={d.label}
                  rows={[
                    { label: "Facturi", value: String(d.count) },
                    { label: "Sold", value: formatRon(d.sold) },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="sold"
            radius={[4, 4, 0, 0]}
            onClick={(entry) => {
              const bucket = (entry as unknown as AgingDatum).bucket;
              onToggle?.(bucket);
            }}
            cursor={onToggle ? "pointer" : undefined}
          >
            {data.map((entry) => (
              <Cell
                key={entry.bucket}
                fill={AGING_COLORS[entry.bucket] ?? "#E8007A"}
                opacity={selected.length === 0 || selected.includes(entry.bucket) ? 1 : 0.3}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

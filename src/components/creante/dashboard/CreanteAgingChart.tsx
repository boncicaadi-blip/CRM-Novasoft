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
import { CREANTE_KPI_DEFINITIONS } from "@/lib/creante-kpi-definitions";
import { formatRon, formatRonCompact } from "@/lib/format";
import type { AgingDatum } from "@/lib/creante-dashboard-analytics";
import type { AgingBucket } from "@/lib/creante-analytics";

const AGING_COLORS: Record<AgingBucket, string> = {
  sold0_30: "#22C55E",
  sold31_60: "#FBBF24",
  sold61_90: "#F97316",
  sold91_180: "#EF4444",
  sold181_365: "#B91C1C",
  sold365Plus: "#7F1D1D",
};

export function CreanteAgingChart({
  data,
  onSelect,
  selected,
}: {
  data: AgingDatum[];
  onSelect?: (bucket: AgingBucket | null) => void;
  selected?: AgingBucket | null;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white">Vechime sold restant (aging)<InfoTooltip title="Vechime sold (aging)" definition={CREANTE_KPI_DEFINITIONS.agingChart} /></p>
        {selected && onSelect && (
          <button
            onClick={() => onSelect(null)}
            className="text-[11px] text-[#E8007A] hover:text-[#FF4FAA]"
          >
            Sterge filtrul
          </button>
        )}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} />
          <YAxis
            tick={{ fontSize: 11, fill: "#94A3B8" }}
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
              onSelect?.(selected === bucket ? null : bucket);
            }}
            cursor={onSelect ? "pointer" : undefined}
          >
            {data.map((entry) => (
              <Cell
                key={entry.bucket}
                fill={AGING_COLORS[entry.bucket] ?? "#E8007A"}
                opacity={!selected || selected === entry.bucket ? 1 : 0.3}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

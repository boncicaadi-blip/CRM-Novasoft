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
import { STAGE_COLORS } from "@/lib/constants";
import { ChartTooltipBox } from "./ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { KPI_DEFINITIONS } from "@/lib/kpi-definitions";
import { formatEur } from "@/lib/format";

interface StageDatum {
  stage: string;
  count: number;
  value: number;
}

export function StageChart({
  data,
  onSelect,
  selected,
}: {
  data: StageDatum[];
  onSelect?: (stage: string | null) => void;
  selected?: string | null;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
          Oportunitati pe Stage
          <InfoTooltip title="Oportunitati pe Stage" definition={KPI_DEFINITIONS.crmStageChart} />
        </p>
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
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis
            dataKey="stage"
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            angle={-20}
            textAnchor="end"
            height={50}
          />
          <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} allowDecimals={false} />
          <Tooltip
            cursor={false}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as StageDatum;
              return (
                <ChartTooltipBox
                  title={d.stage}
                  rows={[
                    { label: "Oportunitati", value: String(d.count) },
                    { label: "Valoare", value: formatEur(d.value) },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="count"
            radius={[4, 4, 0, 0]}
            onClick={(entry) => {
              const stage = (entry as unknown as StageDatum).stage;
              onSelect?.(selected === stage ? null : stage);
            }}
            cursor={onSelect ? "pointer" : undefined}
          >
            {data.map((entry) => (
              <Cell
                key={entry.stage}
                fill={STAGE_COLORS[entry.stage] ?? "#E8007A"}
                opacity={!selected || selected === entry.stage ? 1 : 0.3}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

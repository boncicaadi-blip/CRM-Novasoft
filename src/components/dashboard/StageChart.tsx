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
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-white">Oportunitati pe Stage</p>
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
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis
            dataKey="stage"
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            angle={-20}
            textAnchor="end"
            height={50}
          />
          <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} allowDecimals={false} />
          <Tooltip
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

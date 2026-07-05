"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { STATUS_COLORS } from "@/lib/constants";
import { ChartTooltipBox } from "./ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { KPI_DEFINITIONS } from "@/lib/kpi-definitions";

interface StatusDatum {
  status: string;
  count: number;
}

export function StatusChart({
  data,
  onSelect,
  selected,
}: {
  data: StatusDatum[];
  onSelect?: (status: string | null) => void;
  selected?: string | null;
}) {
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white">
          Distributie Status
          <InfoTooltip title="Distributie Status" definition={KPI_DEFINITIONS.crmStatusChart} />
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
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="status"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            onClick={(entry) => {
              const status = (entry as unknown as StatusDatum).status;
              onSelect?.(selected === status ? null : status);
            }}
            cursor={onSelect ? "pointer" : undefined}
          >
            {data.map((entry) => (
              <Cell
                key={entry.status}
                fill={STATUS_COLORS[entry.status] ?? "#94A3B8"}
                opacity={!selected || selected === entry.status ? 1 : 0.3}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as StatusDatum;
              const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
              return (
                <ChartTooltipBox
                  title={d.status}
                  rows={[
                    { label: "Oportunitati", value: String(d.count) },
                    { label: "Procent", value: `${pct}%` },
                  ]}
                />
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "#94A3B8" }}
            formatter={(value) => <span style={{ color: "#CBD5E1" }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

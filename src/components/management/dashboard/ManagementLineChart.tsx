"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import type { KpiDefinition } from "@/lib/kpi-definitions";

export function ManagementLineChart({
  title,
  data,
  formatValue,
  color = "#E8007A",
  definition,
}: {
  title: string;
  data: { label: string; value: number | null }[];
  formatValue: (v: number) => string;
  color?: string;
  definition?: KpiDefinition;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-white">
        {title}
        {definition && <InfoTooltip title={title} definition={definition} />}
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} />
          <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as { label: string; value: number | null };
              return (
                <ChartTooltipBox
                  title={d.label}
                  rows={[{ label: title, value: d.value !== null ? formatValue(d.value) : "—" }]}
                />
              );
            }}
          />
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} connectNulls />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

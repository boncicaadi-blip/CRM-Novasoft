"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { VENITURI_KPI_DEFINITIONS } from "@/lib/venituri-kpi-definitions";
import { formatEur } from "@/lib/format";
import type { LunaDatum } from "@/lib/venituri-dashboard-analytics";

export function VenituriEvolutieChart({ data }: { data: LunaDatum[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-white">
        Evolutie Estimat vs. Realizat
        <InfoTooltip title="Evolutie Estimat vs. Realizat" definition={VENITURI_KPI_DEFINITIONS.evolutieEstimatRealizat} />
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="estimatGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#475569" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#475569" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="realizatGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94A3B8" }} />
          <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as LunaDatum;
              return (
                <ChartTooltipBox
                  title={d.label}
                  rows={[
                    { label: "Estimat", value: formatEur(d.estimat), color: "#94A3B8" },
                    { label: "Realizat", value: formatEur(d.realizat), color: "#22C55E" },
                  ]}
                />
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />
          <Area
            type="monotone"
            dataKey="estimat"
            name="Estimat"
            stroke="#475569"
            strokeWidth={2}
            fill="url(#estimatGradient)"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="realizat"
            name="Realizat"
            stroke="#22C55E"
            strokeWidth={2}
            fill="url(#realizatGradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatRon, formatRonCompact } from "@/lib/format";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { OBLIGATII_KPI_DEFINITIONS } from "@/lib/obligatii-kpi-definitions";
import type { PlatiMonthDatum } from "@/lib/obligatii-dashboard-analytics";

export function ObligatiiPlatiTimeSeriesChart({ data }: { data: PlatiMonthDatum[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-white">
        Evolutie plati (ultimele 12 luni)
        <InfoTooltip title="Evolutie plati" definition={OBLIGATII_KPI_DEFINITIONS.platiTimeSeriesChart} />
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="platitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22C55E" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} />
          <YAxis
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            tickFormatter={(v) => formatRonCompact(v)}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as PlatiMonthDatum;
              return (
                <ChartTooltipBox
                  title={d.month}
                  rows={[
                    { label: "Platit", value: formatRon(d.total) },
                    { label: "Nr plati", value: String(d.count) },
                  ]}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey="total"
            stroke="#22C55E"
            strokeWidth={2}
            fill="url(#platitGradient)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

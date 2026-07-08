"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { CREANTE_KPI_DEFINITIONS } from "@/lib/creante-kpi-definitions";
import { formatRon, formatRonCompact } from "@/lib/format";
import type { GrtMonthDatum } from "@/lib/creante-dashboard-analytics";

export function CreanteGrtChart({ data }: { data: GrtMonthDatum[] }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-text-primary">
        Dinamica targetului (GRT pe luni)
        <InfoTooltip title="Dinamica targetului (GRT)" definition={CREANTE_KPI_DEFINITIONS.grtChart} />
      </p>
      <p className="mb-3 text-[11px] text-text-muted">
        Bare: target setat vs. incasat efectiv. Linie: gradul de realizare (%).
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
          <YAxis
            yAxisId="valoare"
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            tickFormatter={(v) => formatRonCompact(v)}
          />
          <YAxis
            yAxisId="procent"
            orientation="right"
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            tickFormatter={(v) => `${v}%`}
            domain={[0, "dataMax + 20"]}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as GrtMonthDatum;
              return (
                <ChartTooltipBox
                  title={d.month}
                  rows={[
                    { label: "Target", value: formatRon(d.target), color: "#475569" },
                    { label: "Incasat", value: formatRon(d.realizat), color: "#22C55E" },
                    { label: "GRT", value: d.grt !== null ? `${Math.round(d.grt)}%` : "fara target" },
                  ]}
                />
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)" }} />
          <Bar yAxisId="valoare" dataKey="target" name="Target" fill="#475569" radius={[3, 3, 0, 0]} />
          <Bar yAxisId="valoare" dataKey="realizat" name="Incasat" fill="#22C55E" radius={[3, 3, 0, 0]} />
          <Line
            yAxisId="procent"
            type="monotone"
            dataKey="grt"
            name="GRT %"
            stroke="#E8007A"
            strokeWidth={2}
            dot={{ r: 3, fill: "#E8007A" }}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

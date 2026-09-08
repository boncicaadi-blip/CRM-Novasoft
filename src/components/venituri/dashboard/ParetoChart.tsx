"use client";

import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { formatEur, formatEurCompact } from "@/lib/format";
import type { GrupareDatum } from "@/lib/venituri-dashboard-analytics";
import type { KpiDefinition } from "@/lib/kpi-definitions";

export function ParetoChart({
  title,
  data,
  valueKey,
  definition,
}: {
  title: string;
  data: GrupareDatum[];
  valueKey: "estimat" | "realizat";
  definition?: KpiDefinition;
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
        <p className="text-sm font-medium text-text-primary">{title}</p>
        <p className="py-8 text-center text-xs text-text-muted">Niciun rezultat pentru filtrul curent.</p>
      </div>
    );
  }

  const sortate = [...data].sort((a, b) => b[valueKey] - a[valueKey]);
  const total = sortate.reduce((s, d) => s + d[valueKey], 0);
  const chartData = sortate.reduce<Array<GrupareDatum & { cumulativPct: number }>>((acc, d) => {
    const cumulativAnterior = acc.length > 0 ? (acc[acc.length - 1].cumulativPct * total) / 100 : 0;
    const cumulativ = cumulativAnterior + d[valueKey];
    acc.push({ ...d, cumulativPct: total > 0 ? (cumulativ / total) * 100 : 0 });
    return acc;
  }, []);

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-text-primary">
        {title}
        {definition && <InfoTooltip title={title} definition={definition} />}
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="cheie" tick={false} axisLine={{ stroke: "var(--border-subtle)" }} height={10} />
          <YAxis
            yAxisId="valoare"
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            tickFormatter={(v) => formatEurCompact(v)}
            width={65}
          />
          <YAxis
            yAxisId="procent"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            tickFormatter={(v) => `${v}%`}
            width={45}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as GrupareDatum & { cumulativPct: number };
              const pondere = total > 0 ? (d[valueKey] / total) * 100 : 0;
              return (
                <ChartTooltipBox
                  title={d.cheie}
                  rows={[
                    { label: "Valoare", value: formatEur(d[valueKey]), color: valueKey === "realizat" ? "#0070F3" : "#E8007A" },
                    { label: "Pondere", value: `${pondere.toFixed(1)}%` },
                    { label: "Cumulativ", value: `${d.cumulativPct.toFixed(0)}%` },
                  ]}
                />
              );
            }}
          />
          <Bar yAxisId="valoare" dataKey={valueKey} radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {chartData.map((entry) => (
              <Cell key={entry.cheie} fill={valueKey === "realizat" ? "#0070F3" : "#E8007A"} />
            ))}
          </Bar>
          <Line
            yAxisId="procent"
            type="monotone"
            dataKey="cumulativPct"
            stroke="var(--text-primary)"
            strokeWidth={2}
            dot={{ r: 3 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

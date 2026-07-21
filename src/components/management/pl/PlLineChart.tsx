"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { formatEur, formatEurCompact, formatRon, formatRonCompact } from "@/lib/format";

export interface PlLineChartDatum {
  label: string;
  estimat: number;
  realizat: number;
}

/** moneda: implicit EUR (P&L) - Cashflow (RON) trece explicit "RON". */
export function PlLineChart({ data, moneda = "EUR" }: { data: PlLineChartDatum[]; moneda?: "EUR" | "RON" }) {
  const format = moneda === "RON" ? formatRon : formatEur;
  const formatCompact = moneda === "RON" ? formatRonCompact : formatEurCompact;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
        <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={(v) => formatCompact(v)} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as PlLineChartDatum;
            return (
              <ChartTooltipBox
                title={d.label}
                rows={[
                  { label: "Estimat", value: format(d.estimat), color: "#475569" },
                  { label: "Realizat", value: format(d.realizat), color: "#22C55E" },
                ]}
              />
            );
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)" }} />
        <Bar dataKey="estimat" name="Estimat" fill="#475569" radius={[3, 3, 0, 0]} />
        <Bar dataKey="realizat" name="Realizat" fill="#22C55E" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

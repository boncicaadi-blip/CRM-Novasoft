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
import { KPI_DEFINITIONS } from "@/lib/kpi-definitions";
import { formatEur, formatEurCompact } from "@/lib/format";

export interface CastigatVsTargetDatum {
  label: string;
  castigat: number;
  target: number | null;
  /** Procent de atingere a targetului (null cand nu exista target setat pentru luna respectiva). */
  atingere: number | null;
}

export function RaportLunarCastigatChart({ data }: { data: CastigatVsTargetDatum[] }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-text-primary">
        Castigat vs. Target lunar
        <InfoTooltip title="Castigat vs. Target lunar" definition={KPI_DEFINITIONS.raportLunarCastigatVsTarget} />
      </p>
      <p className="mb-3 text-[11px] text-text-muted">
        Bare: valoare castigata vs. target lunar (target anual / 12). Linie: gradul de atingere (%).
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
          <YAxis
            yAxisId="valoare"
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            tickFormatter={(v) => formatEurCompact(v)}
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
              const d = payload[0].payload as CastigatVsTargetDatum;
              return (
                <ChartTooltipBox
                  title={d.label}
                  rows={[
                    { label: "Castigat", value: formatEur(d.castigat), color: "#22C55E" },
                    { label: "Target", value: d.target !== null ? formatEur(d.target) : "fara target", color: "#475569" },
                    { label: "Atingere", value: d.atingere !== null ? `${Math.round(d.atingere)}%` : "—" },
                  ]}
                />
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)" }} />
          <Bar yAxisId="valoare" dataKey="target" name="Target" fill="#475569" radius={[3, 3, 0, 0]} />
          <Bar yAxisId="valoare" dataKey="castigat" name="Castigat" fill="#22C55E" radius={[3, 3, 0, 0]} />
          <Line
            yAxisId="procent"
            type="monotone"
            dataKey="atingere"
            name="Atingere %"
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

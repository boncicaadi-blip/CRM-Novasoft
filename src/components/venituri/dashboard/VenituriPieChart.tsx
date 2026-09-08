"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { formatEur } from "@/lib/format";
import type { GrupareDatum } from "@/lib/venituri-dashboard-analytics";
import type { KpiDefinition } from "@/lib/kpi-definitions";

const CULORI = ["#E8007A", "#0070F3", "#22C55E", "#FBBF24", "#F97316", "#A855F7", "#06B6D4", "var(--text-secondary)", "#EC4899"];

export function VenituriPieChart({
  title,
  data,
  onToggle,
  selected = [],
  definition,
  valueKey = "realizat",
}: {
  title: string;
  data: GrupareDatum[];
  /** Click pe o felie ADAUGA/SCOATE acea valoare din selectie (multi-select) - nu inlocuieste selectia. */
  onToggle?: (cheie: string) => void;
  selected?: string[];
  definition?: KpiDefinition;
  valueKey?: "estimat" | "realizat";
}) {
  const total = data.reduce((s, d) => s + d[valueKey], 0);
  const valueLabel = valueKey === "estimat" ? "Estimat" : "Realizat";

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
          {title}
          {definition && <InfoTooltip title={title} definition={definition} />}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey="cheie"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={2}
            onClick={(entry) => {
              const cheie = (entry as unknown as GrupareDatum).cheie;
              onToggle?.(cheie);
            }}
            cursor={onToggle ? "pointer" : undefined}
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.cheie}
                fill={CULORI[i % CULORI.length]}
                opacity={selected.length === 0 || selected.includes(entry.cheie) ? 1 : 0.3}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as GrupareDatum;
              const pct = total > 0 ? Math.round((d[valueKey] / total) * 100) : 0;
              return (
                <ChartTooltipBox
                  title={d.cheie}
                  rows={[
                    { label: "Linii", value: String(d.count) },
                    { label: valueLabel, value: formatEur(d[valueKey]) },
                    { label: "Procent", value: `${pct}%` },
                  ]}
                />
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)" }} formatter={(v) => <span style={{ color: "var(--text-primary)" }}>{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

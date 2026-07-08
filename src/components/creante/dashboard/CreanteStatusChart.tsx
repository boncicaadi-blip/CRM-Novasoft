"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { CREANTE_KPI_DEFINITIONS } from "@/lib/creante-kpi-definitions";
import { formatRon } from "@/lib/format";
import type { StatusDatum } from "@/lib/creante-dashboard-analytics";

const STATUS_COLORS: Record<string, string> = {
  restanta: "#EF4444",
  la_zi: "#60A5FA",
  incasata: "#22C55E",
};

export function CreanteStatusChart({
  data,
  onToggle,
  selected = [],
}: {
  data: StatusDatum[];
  onToggle?: (status: string) => void;
  selected?: string[];
}) {
  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">Distributie Status<InfoTooltip title="Distributie Status" definition={CREANTE_KPI_DEFINITIONS.statusChart} /></p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="label"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            onClick={(entry) => {
              const status = (entry as unknown as StatusDatum).status;
              onToggle?.(status);
            }}
            cursor={onToggle ? "pointer" : undefined}
          >
            {data.map((entry) => (
              <Cell
                key={entry.status}
                fill={STATUS_COLORS[entry.status] ?? "var(--text-secondary)"}
                opacity={selected.length === 0 || selected.includes(entry.status) ? 1 : 0.3}
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
                  title={d.label}
                  rows={[
                    { label: "Facturi", value: String(d.count) },
                    { label: "Sold", value: formatRon(d.sold) },
                    { label: "Procent", value: `${pct}%` },
                  ]}
                />
              );
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
            formatter={(value) => <span style={{ color: "var(--text-primary)" }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { OBLIGATII_KPI_DEFINITIONS } from "@/lib/obligatii-kpi-definitions";
import { formatRon } from "@/lib/format";
import type { StatusDatum } from "@/lib/obligatii-dashboard-analytics";

const STATUS_COLORS: Record<string, string> = {
  restanta: "#EF4444",
  la_zi: "#60A5FA",
  platita: "#22C55E",
};

export function ObligatiiStatusChart({
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
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white">Distributie Status<InfoTooltip title="Distributie Status" definition={OBLIGATII_KPI_DEFINITIONS.statusChart} /></p>
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
                fill={STATUS_COLORS[entry.status] ?? "#94A3B8"}
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
            wrapperStyle={{ fontSize: 12, color: "#94A3B8" }}
            formatter={(value) => <span style={{ color: "#CBD5E1" }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

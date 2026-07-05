"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { OBLIGATII_KPI_DEFINITIONS } from "@/lib/obligatii-kpi-definitions";
import { formatRon } from "@/lib/format";
import type { TipAchizitieDatum } from "@/lib/obligatii-dashboard-analytics";

const TIP_COLORS: Record<string, string> = {
  Recurente: "#E8007A",
  Nerecurente: "#0070F3",
  Necunoscut: "#94A3B8",
};

export function ObligatiiTipAchizitieChart({
  data,
  onToggle,
  selected = [],
}: {
  data: TipAchizitieDatum[];
  onToggle?: (tip: string) => void;
  selected?: string[];
}) {
  const total = data.reduce((s, d) => s + d.sold, 0);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white">Distributie Tip Achizitie (dupa sold)<InfoTooltip title="Distributie Tip Achizitie" definition={OBLIGATII_KPI_DEFINITIONS.tipAchizitieChart} /></p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="sold"
            nameKey="tip"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            onClick={(entry) => {
              const tip = (entry as unknown as TipAchizitieDatum).tip;
              onToggle?.(tip);
            }}
            cursor={onToggle ? "pointer" : undefined}
          >
            {data.map((entry) => (
              <Cell
                key={entry.tip}
                fill={TIP_COLORS[entry.tip] ?? "#94A3B8"}
                opacity={selected.length === 0 || selected.includes(entry.tip) ? 1 : 0.3}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as TipAchizitieDatum;
              const pct = total > 0 ? Math.round((d.sold / total) * 100) : 0;
              return (
                <ChartTooltipBox
                  title={d.tip}
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

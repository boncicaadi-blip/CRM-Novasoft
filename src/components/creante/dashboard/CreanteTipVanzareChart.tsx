"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { CREANTE_KPI_DEFINITIONS } from "@/lib/creante-kpi-definitions";
import { formatRon } from "@/lib/format";
import type { TipVanzareDatum } from "@/lib/creante-dashboard-analytics";

const TIP_COLORS: Record<string, string> = {
  Recurente: "#E8007A",
  Nerecurente: "#0070F3",
  Necunoscut: "#94A3B8",
};

export function CreanteTipVanzareChart({
  data,
  onSelect,
  selected,
}: {
  data: TipVanzareDatum[];
  onSelect?: (tip: string | null) => void;
  selected?: string | null;
}) {
  const total = data.reduce((s, d) => s + d.sold, 0);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white">Distributie Tip Vanzare (dupa sold)<InfoTooltip title="Distributie Tip Vanzare" definition={CREANTE_KPI_DEFINITIONS.tipVanzareChart} /></p>
        {selected && onSelect && (
          <button
            onClick={() => onSelect(null)}
            className="text-[11px] text-[#E8007A] hover:text-[#FF4FAA]"
          >
            Sterge filtrul
          </button>
        )}
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
              const tip = (entry as unknown as TipVanzareDatum).tip;
              onSelect?.(selected === tip ? null : tip);
            }}
            cursor={onSelect ? "pointer" : undefined}
          >
            {data.map((entry) => (
              <Cell
                key={entry.tip}
                fill={TIP_COLORS[entry.tip] ?? "#94A3B8"}
                opacity={!selected || selected === entry.tip ? 1 : 0.3}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as TipVanzareDatum;
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

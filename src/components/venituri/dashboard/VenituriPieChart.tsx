"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { formatEur } from "@/lib/format";
import type { GrupareDatum } from "@/lib/venituri-dashboard-analytics";
import type { KpiDefinition } from "@/lib/kpi-definitions";

const CULORI = ["#E8007A", "#0070F3", "#22C55E", "#FBBF24", "#F97316", "#A855F7", "#06B6D4", "#94A3B8", "#EC4899"];

export function VenituriPieChart({
  title,
  data,
  onSelect,
  selected,
  definition,
}: {
  title: string;
  data: GrupareDatum[];
  onSelect?: (cheie: string | null) => void;
  selected?: string | null;
  definition?: KpiDefinition;
}) {
  const total = data.reduce((s, d) => s + d.realizat, 0);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white">
          {title}
          {definition && <InfoTooltip title={title} definition={definition} />}
        </p>
        {selected && onSelect && (
          <button onClick={() => onSelect(null)} className="text-[11px] text-[#E8007A] hover:text-[#FF4FAA]">
            Sterge filtrul
          </button>
        )}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            dataKey="realizat"
            nameKey="cheie"
            innerRadius={45}
            outerRadius={75}
            paddingAngle={2}
            onClick={(entry) => {
              const cheie = (entry as unknown as GrupareDatum).cheie;
              onSelect?.(selected === cheie ? null : cheie);
            }}
            cursor={onSelect ? "pointer" : undefined}
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.cheie}
                fill={CULORI[i % CULORI.length]}
                opacity={!selected || selected === entry.cheie ? 1 : 0.3}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as GrupareDatum;
              const pct = total > 0 ? Math.round((d.realizat / total) * 100) : 0;
              return (
                <ChartTooltipBox
                  title={d.cheie}
                  rows={[
                    { label: "Linii", value: String(d.count) },
                    { label: "Realizat", value: formatEur(d.realizat) },
                    { label: "Procent", value: `${pct}%` },
                  ]}
                />
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} formatter={(v) => <span style={{ color: "#CBD5E1" }}>{v}</span>} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

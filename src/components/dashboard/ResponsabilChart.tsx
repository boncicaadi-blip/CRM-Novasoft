"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { formatEur, formatEurCompact } from "@/lib/format";
import { ChartTooltipBox } from "./ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { KPI_DEFINITIONS } from "@/lib/kpi-definitions";

interface ResponsabilDatum {
  name: string;
  count: number;
  arr: number;
}

export function ResponsabilChart({
  data,
  onSelect,
  selected,
}: {
  data: ResponsabilDatum[];
  onSelect?: (name: string | null) => void;
  selected?: string | null;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white">
          ARR pe Responsabil vanzare
          <InfoTooltip title="ARR pe Responsabil vanzare" definition={KPI_DEFINITIONS.crmResponsabilChart} />
        </p>
        {selected && onSelect && (
          <button
            onClick={() => onSelect(null)}
            className="text-[11px] text-[#E8007A] hover:text-[#FF4FAA]"
          >
            Sterge filtrul
          </button>
        )}
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} tickFormatter={(v) => formatEurCompact(v)} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            width={110}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as ResponsabilDatum;
              return (
                <ChartTooltipBox
                  title={d.name}
                  rows={[
                    { label: "Oportunitati", value: String(d.count) },
                    { label: "ARR", value: formatEur(d.arr) },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="arr"
            radius={[0, 4, 4, 0]}
            barSize={18}
            onClick={(entry) => {
              const name = (entry as unknown as ResponsabilDatum).name ?? null;
              onSelect?.(selected === name ? null : name);
            }}
            cursor={onSelect ? "pointer" : undefined}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill="#E8007A"
                opacity={!selected || selected === entry.name ? 1 : 0.3}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { formatEur } from "@/lib/format";
import type { GrupareDatum } from "@/lib/venituri-dashboard-analytics";
import type { KpiDefinition } from "@/lib/kpi-definitions";

/** Bar chart generic, reutilizabil - folosit pentru Top Clienti, dar si
 * pentru Produs/Serviciu (bare, nu placinte, la cererea utilizatorului). */
export function VenituriTopClientiChart({
  title,
  data,
  onToggle,
  selected = [],
  definition,
}: {
  title: string;
  data: GrupareDatum[];
  onToggle?: (cheie: string) => void;
  selected?: string[];
  definition?: KpiDefinition;
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white">
          {title}
          {definition && <InfoTooltip title={title} definition={definition} />}
        </p>
        <p className="py-8 text-center text-xs text-slate-500">Niciun rezultat pentru filtrul curent.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white">
          {title}
          {definition && <InfoTooltip title={title} definition={definition} />}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 30)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} />
          <YAxis type="category" dataKey="cheie" tick={{ fontSize: 10, fill: "#94A3B8" }} width={150} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as GrupareDatum;
              return (
                <ChartTooltipBox
                  title={d.cheie}
                  rows={[
                    { label: "Estimat", value: formatEur(d.estimat) },
                    { label: "Realizat", value: formatEur(d.realizat) },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="realizat"
            radius={[0, 4, 4, 0]}
            barSize={16}
            onClick={(entry) => {
              const cheie = (entry as unknown as GrupareDatum).cheie;
              onToggle?.(cheie);
            }}
            cursor={onToggle ? "pointer" : undefined}
          >
            {data.map((entry) => (
              <Cell
                key={entry.cheie}
                fill="#E8007A"
                opacity={selected.length === 0 || selected.includes(entry.cheie) ? 1 : 0.3}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { formatEur } from "@/lib/format";
import type { GrupareDatum } from "@/lib/venituri-dashboard-analytics";
import type { KpiDefinition } from "@/lib/kpi-definitions";

/** Bar chart generic, reutilizabil - o singura bara continua per categorie:
 * portiunea realizata (albastru) plus restul pana la estimat (magenta) -
 * stivuite impreuna, nu suprapuse - exact ca un progres in interiorul
 * barei de estimat. Daca realizatul depaseste estimatul, toata bara arata
 * albastru (fara portiune "ramasa"). */
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
      <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
        <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
          {title}
          {definition && <InfoTooltip title={title} definition={definition} />}
        </p>
        <p className="py-8 text-center text-xs text-text-muted">Niciun rezultat pentru filtrul curent.</p>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    ramas: Math.max(0, d.estimat - d.realizat),
  }));
  const totalRealizat = data.reduce((s, d) => s + d.realizat, 0);
  const totalEstimat = data.reduce((s, d) => s + d.estimat, 0);

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
          {title}
          {definition && <InfoTooltip title={title} definition={definition} />}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(200, data.length * 30)}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
          <YAxis type="category" dataKey="cheie" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} width={150} />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as GrupareDatum;
              const pctRealizat = totalRealizat > 0 ? Math.round((d.realizat / totalRealizat) * 100) : 0;
              const pctEstimat = totalEstimat > 0 ? Math.round((d.estimat / totalEstimat) * 100) : 0;
              return (
                <ChartTooltipBox
                  title={d.cheie}
                  rows={[
                    { label: "Realizat", value: `${formatEur(d.realizat)} (${pctRealizat}%)`, color: "#0070F3" },
                    { label: "Estimat", value: `${formatEur(d.estimat)} (${pctEstimat}%)`, color: "#E8007A" },
                  ]}
                />
              );
            }}
          />
          {/* Realizat - portiunea din stanga, albastru */}
          <Bar
            dataKey="realizat"
            stackId="bara"
            radius={[0, 0, 0, 0]}
            barSize={16}
            onClick={(entry) => onToggle?.((entry as unknown as GrupareDatum).cheie)}
            cursor={onToggle ? "pointer" : undefined}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.cheie}
                fill="#0070F3"
                opacity={selected.length === 0 || selected.includes(entry.cheie) ? 1 : 0.3}
              />
            ))}
          </Bar>
          {/* Ramas pana la estimat - continuarea barei, magenta */}
          <Bar
            dataKey="ramas"
            stackId="bara"
            radius={[0, 4, 4, 0]}
            barSize={16}
            onClick={(entry) => onToggle?.((entry as unknown as GrupareDatum).cheie)}
            cursor={onToggle ? "pointer" : undefined}
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.cheie}
                fill="#E8007A"
                opacity={selected.length === 0 || selected.includes(entry.cheie) ? 1 : 0.3}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-2 flex items-center gap-4 text-[11px] text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#0070F3]" />
          Realizat
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#E8007A]" />
          Estimat (ramas)
        </span>
      </div>
    </div>
  );
}

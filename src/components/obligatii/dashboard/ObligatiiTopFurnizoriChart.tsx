"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { formatRon, formatRonCompact } from "@/lib/format";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { OBLIGATII_KPI_DEFINITIONS } from "@/lib/obligatii-kpi-definitions";
import type { FurnizorDatum } from "@/lib/obligatii-dashboard-analytics";

export function ObligatiiTopFurnizoriChart({
  data,
  onToggle,
  selected = [],
}: {
  data: FurnizorDatum[];
  onToggle?: (numeFurnizor: string) => void;
  selected?: string[];
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
        <p className="mb-1 text-sm font-medium text-text-primary">Top furnizori dupa sold restant</p>
        <p className="py-8 text-center text-xs text-text-muted">Niciun furnizor cu sold restant.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">Top furnizori dupa sold restant<InfoTooltip title="Top furnizori dupa sold restant" definition={OBLIGATII_KPI_DEFINITIONS.topFurnizoriChart} /></p>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={(v) => formatRonCompact(v)} />
          <YAxis
            type="category"
            dataKey="numeFurnizor"
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            width={130}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as FurnizorDatum;
              return (
                <ChartTooltipBox
                  title={d.numeFurnizor}
                  rows={[
                    { label: "Facturi restante", value: String(d.count) },
                    { label: "Sold", value: formatRon(d.sold) },
                  ]}
                />
              );
            }}
          />
          <Bar
            dataKey="sold"
            radius={[0, 4, 4, 0]}
            barSize={18}
            onClick={(entry) => {
              const numeFurnizor = (entry as unknown as FurnizorDatum).numeFurnizor;
              if (numeFurnizor) onToggle?.(numeFurnizor);
            }}
            cursor={onToggle ? "pointer" : undefined}
          >
            {data.map((entry) => (
              <Cell
                key={entry.numeFurnizor}
                fill="#E8007A"
                opacity={selected.length === 0 || selected.includes(entry.numeFurnizor) ? 1 : 0.3}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

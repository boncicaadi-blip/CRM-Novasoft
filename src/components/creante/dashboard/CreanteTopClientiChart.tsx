"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import { formatRon, formatRonCompact } from "@/lib/format";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { CREANTE_KPI_DEFINITIONS } from "@/lib/creante-kpi-definitions";
import type { ClientDatum } from "@/lib/creante-dashboard-analytics";

export function CreanteTopClientiChart({
  data,
  onToggle,
  selected = [],
}: {
  data: ClientDatum[];
  onToggle?: (numeFirma: string) => void;
  selected?: string[];
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="mb-1 text-sm font-medium text-white">Top clienti dupa sold restant</p>
        <p className="py-8 text-center text-xs text-slate-500">Niciun client cu sold restant.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white">Top clienti dupa sold restant<InfoTooltip title="Top clienti dupa sold restant" definition={CREANTE_KPI_DEFINITIONS.topClientiChart} /></p>
      </div>
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} tickFormatter={(v) => formatRonCompact(v)} />
          <YAxis
            type="category"
            dataKey="numeFirma"
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            width={130}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as ClientDatum;
              return (
                <ChartTooltipBox
                  title={d.numeFirma}
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
              const numeFirma = (entry as unknown as ClientDatum).numeFirma;
              if (numeFirma) onToggle?.(numeFirma);
            }}
            cursor={onToggle ? "pointer" : undefined}
          >
            {data.map((entry) => (
              <Cell
                key={entry.numeFirma}
                fill="#E8007A"
                opacity={selected.length === 0 || selected.includes(entry.numeFirma) ? 1 : 0.3}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

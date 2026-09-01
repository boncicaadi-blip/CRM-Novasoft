"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { STAGE_COLORS } from "@/lib/constants";
import { ChartTooltipBox } from "./ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { KPI_DEFINITIONS } from "@/lib/kpi-definitions";
import type { StageEvolutionDatum } from "@/lib/analytics";

export function StageEvolutionChart({
  data,
  stageOrder,
}: {
  data: StageEvolutionDatum[];
  stageOrder: string[];
}) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
        <p className="mb-1 text-sm font-medium text-text-primary">Miscare intre stage-uri, in timp</p>
        <p className="py-12 text-center text-xs text-text-muted">
          Nu exista inca istoric suficient. Se acumuleaza automat pe masura ce modifici oportunitati.
        </p>
      </div>
    );
  }

  // Aplatizam stageCounts direct pe fiecare rand, ca recharts sa poata citi
  // fiecare stage ca un dataKey separat. Ariile stivuite, cu curbe netede
  // (monotone), dau efectul de "fasii care curg" intre luni - aproximeaza
  // stilul alluvial/stream cerut, fara o librarie separata de Sankey.
  const chartData = data.map((d) => ({ month: d.month, total: d.total, ...d.stageCounts }));

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
          Miscare intre stage-uri, in timp
          <InfoTooltip title="Miscare intre stage-uri" definition={KPI_DEFINITIONS.crmMiscareStageuri} />
        </p>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
          <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} allowDecimals={false} width={40} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              const rows = stageOrder
                .map((stage) => {
                  const entry = payload.find((p) => p.dataKey === stage);
                  const value = (entry?.value as number) ?? 0;
                  return value > 0 ? { label: stage, value: String(value) } : null;
                })
                .filter((r): r is { label: string; value: string } => r !== null);
              const total = payload.reduce((s, p) => s + ((p.value as number) ?? 0), 0);
              rows.push({ label: "Total", value: String(total) });
              return <ChartTooltipBox title={String(label)} rows={rows} />;
            }}
          />
          {stageOrder.map((stage) => (
            <Area
              key={stage}
              type="monotone"
              dataKey={stage}
              stackId="stages"
              stroke={STAGE_COLORS[stage] ?? "#94A3B8"}
              fill={STAGE_COLORS[stage] ?? "#94A3B8"}
              fillOpacity={0.75}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-text-muted">
        {stageOrder.map((stage) => (
          <span key={stage} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STAGE_COLORS[stage] ?? "#94A3B8" }} />
            {stage}
          </span>
        ))}
      </div>
    </div>
  );
}

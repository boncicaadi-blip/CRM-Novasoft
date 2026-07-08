"use client";

import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { formatRon, formatRonCompact } from "@/lib/format";
import { CREANTE_KPI_DEFINITIONS } from "@/lib/creante-kpi-definitions";
import type { ZiLunaDatum } from "@/lib/creante-dashboard-analytics";

export function CreanteZiuaLuniiChart({ data }: { data: ZiLunaDatum[] }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-text-primary">
        In ce zile ale lunii se incaseaza (istoric)
        <InfoTooltip title="Zilele lunii" definition={CREANTE_KPI_DEFINITIONS.ziuaLunii} />
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="zi" tick={{ fontSize: 10, fill: "var(--text-secondary)" }} interval={0} />
          <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={(v) => formatRonCompact(v)} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as ZiLunaDatum;
              return (
                <ChartTooltipBox
                  title={`Ziua ${d.zi}`}
                  rows={[
                    { label: "Incasat", value: formatRon(d.suma) },
                    { label: "Trend (medie 3 zile)", value: formatRon(d.trend) },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="suma" fill="#0070F3" radius={[3, 3, 0, 0]} />
          <Line type="monotone" dataKey="trend" stroke="#E8007A" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { CREANTE_KPI_DEFINITIONS } from "@/lib/creante-kpi-definitions";
import { formatRon, formatRonCompact } from "@/lib/format";

interface DinamicaDatum {
  month: string;
  facturat: number;
  incasat: number;
}

export function CreanteDinamicaChart({ data }: { data: DinamicaDatum[] }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <p className="mb-1 flex items-center gap-1.5 text-sm font-medium text-text-primary">
        Dinamica creantelor (facturat vs. incasat)
        <InfoTooltip title="Dinamica creantelor" definition={CREANTE_KPI_DEFINITIONS.dinamicaChart} />
      </p>
      <p className="mb-3 text-[11px] text-text-muted">
        Cat s-a emis nou in fiecare luna (dupa data facturii) fata de cat s-a incasat efectiv
        (dupa data incasarii).
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
          <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={(v) => formatRonCompact(v)} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as DinamicaDatum;
              return (
                <ChartTooltipBox
                  title={d.month}
                  rows={[
                    { label: "Facturat", value: formatRon(d.facturat), color: "#0070F3" },
                    { label: "Incasat", value: formatRon(d.incasat), color: "#22C55E" },
                  ]}
                />
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)" }} />
          <Bar dataKey="facturat" name="Facturat" fill="#0070F3" radius={[3, 3, 0, 0]} />
          <Line type="monotone" dataKey="incasat" name="Incasat" stroke="#22C55E" strokeWidth={2} dot={{ r: 3 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

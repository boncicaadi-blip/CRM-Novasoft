"use client";

import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { formatRon, formatRonCompact } from "@/lib/format";

export interface CashflowCombinedDatum {
  label: string;
  incasari: number;
  plati: number;
  net: number;
}

export function CashflowCombinedChart({ data }: { data: CashflowCombinedDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
        <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={(v) => formatRonCompact(v)} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as CashflowCombinedDatum;
            return (
              <ChartTooltipBox
                title={d.label}
                rows={[
                  { label: "Incasari", value: formatRon(d.incasari), color: "#22C55E" },
                  { label: "Plati", value: formatRon(d.plati), color: "#F97316" },
                  { label: "Net", value: formatRon(d.net), color: "#E8007A" },
                ]}
              />
            );
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)" }} />
        <Bar dataKey="incasari" name="Incasari" fill="#22C55E" radius={[3, 3, 0, 0]} />
        <Bar dataKey="plati" name="Plati" fill="#F97316" radius={[3, 3, 0, 0]} />
        <Line type="monotone" dataKey="net" name="Cashflow Net" stroke="#E8007A" strokeWidth={2} dot={{ r: 3, fill: "#E8007A" }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

"use client";

import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { formatEur, formatEurCompact } from "@/lib/format";
import type { PlMonthKey, PlValoare } from "@/lib/pl-analytics";

/**
 * Aceleasi culori ca la Cashflow (CashflowCombinedChart) - Venituri
 * (echivalentul Incasari) verde, Cheltuieli (echivalentul Plati) portocaliu,
 * Profit (echivalentul Net) magenta. Consecvent peste tot in aplicatie.
 */
const CULOARE_VENITURI = "#22C55E";
const CULOARE_CHELTUIELI = "#F97316";
const CULOARE_PROFIT = "#E8007A";

export function PlCombinedChart({
  luni,
  venituriPerLuna,
  costuriPerLuna,
  profitPerLuna,
}: {
  luni: PlMonthKey[];
  venituriPerLuna: Record<string, PlValoare>;
  costuriPerLuna: Record<string, PlValoare>;
  profitPerLuna: Record<string, PlValoare>;
}) {
  const data = luni.map((l) => ({
    label: l.label,
    venituri: venituriPerLuna[l.luna]?.realizat ?? 0,
    cheltuieli: costuriPerLuna[l.luna]?.realizat ?? 0,
    profit: profitPerLuna[l.luna]?.realizat ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
        <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={(v) => formatEurCompact(v)} width={65} />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload as (typeof data)[number];
            return (
              <ChartTooltipBox
                title={d.label}
                rows={[
                  { label: "Venituri", value: formatEur(d.venituri), color: CULOARE_VENITURI },
                  { label: "Cheltuieli", value: formatEur(d.cheltuieli), color: CULOARE_CHELTUIELI },
                  { label: "Profit", value: formatEur(d.profit), color: CULOARE_PROFIT },
                ]}
              />
            );
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)" }} />
        <Bar dataKey="venituri" name="Venituri" fill={CULOARE_VENITURI} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        <Bar dataKey="cheltuieli" name="Cheltuieli" fill={CULOARE_CHELTUIELI} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        <Line
          type="monotone"
          dataKey="profit"
          name="Profit"
          stroke={CULOARE_PROFIT}
          strokeWidth={2}
          dot={{ r: 3, fill: CULOARE_PROFIT }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

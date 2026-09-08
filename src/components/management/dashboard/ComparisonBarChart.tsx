"use client";

import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { formatEur, formatEurCompact } from "@/lib/format";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { MANAGEMENT_KPI_DEFINITIONS } from "@/lib/management-kpi-definitions";
import type { PeriodComparisonValue } from "@/lib/pl-analytics";

function formatVariatieProcent(v: PeriodComparisonValue): string {
  if (v.variatieProcent === null) return "—";
  const procent = v.variatieProcent * 100;
  return `${procent >= 0 ? "+" : ""}${procent.toFixed(1)}%`;
}

export function ComparisonBarChart({
  momVenituri,
  momCheltuieli,
  momProfit,
  yoyVenituri,
  yoyCheltuieli,
  yoyProfit,
}: {
  momVenituri: PeriodComparisonValue;
  momCheltuieli: PeriodComparisonValue;
  momProfit: PeriodComparisonValue;
  yoyVenituri: PeriodComparisonValue;
  yoyCheltuieli: PeriodComparisonValue;
  yoyProfit: PeriodComparisonValue;
}) {
  const [mode, setMode] = useState<"mom" | "yoy">("mom");
  const venituri = mode === "mom" ? momVenituri : yoyVenituri;
  const cheltuieli = mode === "mom" ? momCheltuieli : yoyCheltuieli;
  const profit = mode === "mom" ? momProfit : yoyProfit;

  const data = [
    { categorie: "Venituri", curent: venituri.curent, anterior: venituri.anterior ?? 0, variatie: venituri },
    { categorie: "Cheltuieli", curent: cheltuieli.curent, anterior: cheltuieli.anterior ?? 0, variatie: cheltuieli },
    { categorie: "Profit", curent: profit.curent, anterior: profit.anterior ?? 0, variatie: profit },
  ];

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
          Comparatie MoM / YoY
          <InfoTooltip title="Comparatie MoM / YoY" definition={MANAGEMENT_KPI_DEFINITIONS.comparatiePerioade} />
        </p>
        <div className="flex items-center gap-1 rounded-md border border-border-subtle p-0.5">
          <button
            onClick={() => setMode("mom")}
            className={`rounded px-2 py-1 text-xs font-medium transition ${
              mode === "mom" ? "bg-surface-2 text-text-primary" : "text-text-muted hover:text-text-primary"
            }`}
          >
            Fata de luna trecuta
          </button>
          <button
            onClick={() => setMode("yoy")}
            className={`rounded px-2 py-1 text-xs font-medium transition ${
              mode === "yoy" ? "bg-surface-2 text-text-primary" : "text-text-muted hover:text-text-primary"
            }`}
          >
            Fata de anul trecut
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="categorie" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
          <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={(v) => formatEurCompact(v)} width={70} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as (typeof data)[number];
              return (
                <ChartTooltipBox
                  title={d.categorie}
                  rows={[
                    { label: mode === "mom" ? "Luna curenta" : "Perioada curenta", value: formatEur(d.curent) },
                    { label: mode === "mom" ? "Luna trecuta" : "Anul trecut", value: formatEur(d.anterior) },
                    { label: "Variatie", value: formatVariatieProcent(d.variatie) },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="curent" name="Curent" fill="#E8007A" isAnimationActive={false} radius={[4, 4, 0, 0]} />
          <Bar dataKey="anterior" name="Anterior" fill="#94A3B8" isAnimationActive={false} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
} from "recharts";
import { formatEur, formatEurCompact } from "@/lib/format";
import { ChartTooltipBox } from "./ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import type { KpiDefinition } from "@/lib/kpi-definitions";

interface TimeSeriesDatum {
  month: string;
  arr: number;
  mrr: number;
  implementare: number;
  count: number;
  dateFrom: string;
  dateTo: string;
}

export function TimeSeriesChart({
  data,
  onSelectRange,
  selectedRange,
  dataKey = "mrr",
  title = "Evolutie MRR in timp (din istoric)",
  tooltipLabel = "MRR",
  color = "#E8007A",
  definition,
}: {
  data: TimeSeriesDatum[];
  onSelectRange?: (range: { dateFrom: string; dateTo: string } | null) => void;
  selectedRange?: { dateFrom: string; dateTo: string } | null;
  dataKey?: "arr" | "mrr" | "implementare";
  title?: string;
  tooltipLabel?: string;
  color?: string;
  definition?: KpiDefinition;
}) {
  const [dragStart, setDragStart] = useState<string | null>(null);
  const [dragEnd, setDragEnd] = useState<string | null>(null);
  const gradientId = `tsGradient-${dataKey}`;

  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
        <p className="mb-1 text-sm font-medium text-text-primary">{title}</p>
        <p className="py-12 text-center text-xs text-text-muted">
          Nu exista inca istoric suficient. Se acumuleaza automat pe masura ce modifici oportunitati.
        </p>
      </div>
    );
  }

  function finishSelection() {
    if (!dragStart || !dragEnd || !onSelectRange) {
      setDragStart(null);
      setDragEnd(null);
      return;
    }
    const startIdx = data.findIndex((d) => d.month === dragStart);
    const endIdx = data.findIndex((d) => d.month === dragEnd);
    const [from, to] = startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];

    if (from === to) {
      // Click simplu (fara drag real) - tratam ca selectie pe o singura luna.
      onSelectRange({ dateFrom: data[from].dateFrom, dateTo: data[from].dateTo });
    } else {
      onSelectRange({ dateFrom: data[from].dateFrom, dateTo: data[to].dateTo });
    }
    setDragStart(null);
    setDragEnd(null);
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
          {title}
          {definition && <InfoTooltip title={title} definition={definition} />}
        </p>
        {selectedRange && onSelectRange && (
          <button
            onClick={() => onSelectRange(null)}
            className="text-[11px] text-[#E8007A] hover:text-[#FF4FAA]"
          >
            Sterge selectia
          </button>
        )}
      </div>
      {onSelectRange && (
        <p className="mb-2 text-[11px] text-text-muted">
          Trage cu mouse-ul peste grafic pentru a selecta un interval.
        </p>
      )}
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          onMouseDown={(e) => onSelectRange && e?.activeLabel && setDragStart(String(e.activeLabel))}
          onMouseMove={(e) => dragStart && e?.activeLabel && setDragEnd(String(e.activeLabel))}
          onMouseUp={finishSelection}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
          <YAxis
            tick={{ fontSize: 11, fill: "var(--text-secondary)" }}
            tickFormatter={(v) => formatEurCompact(v)}
            width={70}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as TimeSeriesDatum;
              return (
                <ChartTooltipBox
                  title={d.month}
                  rows={[
                    {
                      label: tooltipLabel,
                      value: d[dataKey] === 0 ? "0 €" : formatEur(d[dataKey]),
                      color,
                    },
                    { label: "Oportunitati", value: String(d.count) },
                  ]}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
          />
          {dragStart && dragEnd && (
            <ReferenceArea x1={dragStart} x2={dragEnd} fill="#0070F3" fillOpacity={0.15} />
          )}
          {selectedRange &&
            (() => {
              const fromMonth = data.find((d) => d.dateFrom <= selectedRange.dateFrom && d.dateTo >= selectedRange.dateFrom)?.month;
              const toMonth = data.find((d) => d.dateFrom <= selectedRange.dateTo && d.dateTo >= selectedRange.dateTo)?.month;
              if (!fromMonth || !toMonth) return null;
              return (
                <ReferenceArea x1={fromMonth} x2={toMonth} fill="#0070F3" fillOpacity={0.1} stroke="#0070F3" strokeOpacity={0.4} />
              );
            })()}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatEurCompact } from "@/lib/format";

export function TimeSeriesChart({ data }: { data: { month: string; arr: number; count: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <p className="mb-1 text-sm font-medium text-white">Evolutie ARR in timp</p>
        <p className="py-12 text-center text-xs text-slate-500">
          Nu exista inca istoric suficient. Se acumuleaza automat pe masura ce modifici oportunitati.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="mb-3 text-sm font-medium text-white">Evolutie ARR in timp (din istoric)</p>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <defs>
            <linearGradient id="arrGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E8007A" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#E8007A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94A3B8" }} />
          <YAxis
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            tickFormatter={(v) => formatEurCompact(v)}
          />
          <Tooltip
            contentStyle={{
              background: "#111535",
              border: "1px solid #ffffff20",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [formatEurCompact(Number(value)), "ARR"]}
          />
          <Area
            type="monotone"
            dataKey="arr"
            stroke="#E8007A"
            strokeWidth={2}
            fill="url(#arrGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

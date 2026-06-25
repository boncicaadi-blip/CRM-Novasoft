"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { STAGE_COLORS } from "@/lib/constants";

export function StageChart({ data }: { data: { stage: string; count: number; value: number }[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="mb-3 text-sm font-medium text-white">Oportunitati pe Stage</p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis
            dataKey="stage"
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            angle={-20}
            textAnchor="end"
            height={50}
          />
          <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "#111535",
              border: "1px solid #ffffff20",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#fff" }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.stage} fill={STAGE_COLORS[entry.stage] ?? "#E8007A"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

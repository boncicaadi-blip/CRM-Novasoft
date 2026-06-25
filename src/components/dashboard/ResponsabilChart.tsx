"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { formatEurCompact } from "@/lib/format";

export function ResponsabilChart({ data }: { data: { name: string; count: number; arr: number }[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="mb-3 text-sm font-medium text-white">ARR pe Responsabil vanzare</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} tickFormatter={(v) => formatEurCompact(v)} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            width={110}
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
          <Bar dataKey="arr" fill="#E8007A" radius={[0, 4, 4, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

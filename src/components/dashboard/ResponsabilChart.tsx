"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const currency = new Intl.NumberFormat("ro-RO", { notation: "compact", maximumFractionDigits: 1 });

export function ResponsabilChart({ data }: { data: { name: string; count: number; arr: number }[] }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <p className="mb-3 text-sm font-medium text-white">ARR pe Responsabil vanzare</p>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: "#94A3B8" }} tickFormatter={(v) => currency.format(v)} />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "#94A3B8" }}
            width={110}
          />
          <Tooltip
            contentStyle={{
              background: "#0E1420",
              border: "1px solid #ffffff20",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [`${currency.format(Number(value))} lei`, "ARR"]}
          />
          <Bar dataKey="arr" fill="#2DD4BF" radius={[0, 4, 4, 0]} barSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

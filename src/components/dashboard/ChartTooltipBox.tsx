import { formatEur } from "@/lib/format";

interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

export function ChartTooltipBox({
  title,
  rows,
}: {
  title: string;
  rows: TooltipRow[];
}) {
  return (
    <div className="rounded-lg border border-white/20 bg-[#111535] px-3 py-2 text-xs shadow-xl">
      <p className="mb-1.5 font-medium text-white">{title}</p>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-1.5 text-slate-400">
              {row.color && (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: row.color }}
                />
              )}
              {row.label}
            </span>
            <span className="font-mono text-slate-200">{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function formatTooltipEur(value: number) {
  return formatEur(value);
}

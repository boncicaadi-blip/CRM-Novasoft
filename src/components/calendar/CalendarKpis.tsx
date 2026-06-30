import Link from "next/link";

export function CalendarKpis({
  today,
  overdue,
  upcoming,
}: {
  today: number;
  overdue: number;
  upcoming: number;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 px-4 pt-4 sm:grid-cols-3 sm:px-6">
      <Link
        href="/actiuni?filter=azi"
        className="rounded-lg border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/20"
      >
        <p className="text-[11px] text-slate-500">Actiuni azi</p>
        <p className="font-mono text-xl text-white">{today > 0 ? today : "--"}</p>
      </Link>
      <Link
        href="/actiuni?filter=intarziate"
        className="rounded-lg border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/20"
      >
        <p className="text-[11px] text-slate-500">Actiuni intarziate</p>
        <p className="font-mono text-xl text-red-400">{overdue}</p>
      </Link>
      <Link
        href="/actiuni?filter=saptamana"
        className="rounded-lg border border-white/10 bg-white/[0.02] p-3 transition hover:border-white/20"
      >
        <p className="text-[11px] text-slate-500">Actiuni viitoare</p>
        <p className="font-mono text-xl text-[#0070F3]">{upcoming}</p>
      </Link>
    </div>
  );
}

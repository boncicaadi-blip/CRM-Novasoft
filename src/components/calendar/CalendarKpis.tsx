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
    <div className="grid grid-cols-3 gap-3 px-6 pt-4">
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <p className="text-[11px] text-slate-500">Actiuni azi</p>
        <p className="font-mono text-xl text-white">{today > 0 ? today : "--"}</p>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <p className="text-[11px] text-slate-500">Actiuni intarziate</p>
        <p className="font-mono text-xl text-red-400">{overdue}</p>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
        <p className="text-[11px] text-slate-500">Actiuni viitoare</p>
        <p className="font-mono text-xl text-[#0070F3]">{upcoming}</p>
      </div>
    </div>
  );
}

"use client";

import { Filter } from "lucide-react";
import { formatEur } from "@/lib/format";
import type { CheltuialaLinie } from "@/types/cheltuieli";

export function CheltuieliComponentaList({ linii }: { linii: CheltuialaLinie[] }) {
  const sortate = [...linii].sort((a, b) => (b.valoare_realizata ?? 0) - (a.valoare_realizata ?? 0));

  return (
    <div className="rounded-xl border border-[#E8007A]/20 bg-[#E8007A]/[0.02] p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <Filter size={14} className="text-[#E8007A]" />
        <p className="text-sm font-medium text-white">Componenta selectiei</p>
        <span className="ml-auto rounded-full bg-white/10 px-1.5 py-0.5 text-[11px] text-slate-400">
          {sortate.length}
        </span>
      </div>

      <div className="max-h-[500px] space-y-1.5 overflow-y-auto pr-1">
        {sortate.map((l) => (
          <div key={l.id} className="rounded-md bg-white/[0.02] px-2.5 py-2 text-sm">
            <p className="truncate text-slate-200">
              {l.incadrare} · {l.clasa}
            </p>
            <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-slate-500">
              <span className="truncate">
                {l.detaliu ?? "—"} ·{" "}
                {new Date(l.luna).toLocaleDateString("ro-RO", { month: "short", year: "numeric" })}
              </span>
              <span className="shrink-0 font-mono text-slate-300">
                {formatEur(l.valoare_realizata ?? l.valoare_prognozata)}
              </span>
            </div>
          </div>
        ))}
        {sortate.length === 0 && (
          <p className="py-4 text-center text-xs text-slate-500">Niciun rezultat pentru selectia curenta.</p>
        )}
      </div>
    </div>
  );
}

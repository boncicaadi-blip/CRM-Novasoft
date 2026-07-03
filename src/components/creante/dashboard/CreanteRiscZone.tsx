"use client";

import { AlertTriangle, Flame } from "lucide-react";
import { formatRon } from "@/lib/format";
import { getZileDepasire } from "@/lib/creante-analytics";
import type { Creanta } from "@/types/creante";

export function CreanteRiscZone({
  facturi,
  onSelect,
}: {
  facturi: Creanta[];
  onSelect: (c: Creanta) => void;
}) {
  if (facturi.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.03] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Flame size={16} className="text-amber-400" />
        <p className="text-sm font-medium text-white">Facturi cu risc mare</p>
      </div>
      <p className="mb-3 text-[11px] text-slate-500">
        Sold mare si vechime mare - cele mai importante de urmarit.
      </p>
      <div className="space-y-1.5">
        {facturi.map((c) => {
          const zile = getZileDepasire(c);
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className="block w-full rounded-md bg-white/[0.02] px-2 py-1.5 text-left text-xs transition hover:bg-white/5"
            >
              <p className="truncate text-slate-200">{c.nume_firma}</p>
              <p className="flex items-center gap-1 text-[10px] text-slate-500">
                <AlertTriangle size={10} className="text-red-400" />
                {zile}z restanta · {formatRon(c.sold)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { Filter } from "lucide-react";
import { formatRon } from "@/lib/format";
import { getZileDepasire, getCreantaStatus } from "@/lib/creante-analytics";
import type { Creanta } from "@/types/creante";

/** Lista facturilor care compun selectia curenta (filtre active) - aceeasi
 * regula ca la Dashboard CRM/Pipeline si Venituri: cand filtrezi, arata DIN
 * CE se compune, nu doar totalul. */
export function CreanteComponentaList({
  facturi,
  onSelect,
}: {
  facturi: Creanta[];
  onSelect: (c: Creanta) => void;
}) {
  const sortate = [...facturi].sort((a, b) => b.sold - a.sold);

  return (
    <div className="rounded-xl border border-[#E8007A]/20 bg-[#E8007A]/[0.02] p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <Filter size={14} className="text-[#E8007A]" />
        <p className="text-sm font-medium text-text-primary">Componenta selectiei</p>
        <span className="ml-auto rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] text-text-secondary">
          {sortate.length}
        </span>
      </div>

      <div className="max-h-[500px] space-y-1.5 overflow-y-auto pr-1">
        {sortate.map((c) => {
          const status = getCreantaStatus(c);
          const zile = getZileDepasire(c);
          return (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className="block w-full rounded-md bg-surface-1 px-2.5 py-2 text-left text-sm transition hover:bg-surface-1"
            >
              <p className="truncate text-text-primary">{c.nume_firma}</p>
              <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-text-muted">
                <span className="truncate">
                  {c.nr_factura} · {status}
                  {status === "restanta" && zile !== null ? ` (${zile}z)` : ""}
                </span>
                <span className="shrink-0 font-mono text-text-primary">{formatRon(c.sold)}</span>
              </div>
            </button>
          );
        })}
        {sortate.length === 0 && (
          <p className="py-4 text-center text-xs text-text-muted">Niciun rezultat pentru selectia curenta.</p>
        )}
      </div>
    </div>
  );
}

"use client";

import { Filter } from "lucide-react";
import { formatEur } from "@/lib/format";
import type { VenitLinie } from "@/types/venituri";

/** Lista liniilor care compun selectia curenta (filtre active) - aceeasi
 * idee ca la Dashboard CRM/Pipeline (lista de oportunitati filtrate) sau
 * la Creante (RiscZone) - de acum, regula pentru orice raport nou: cand
 * selectezi ceva (KPI, felie de grafic, bara), arata-i utilizatorului DIN CE
 * se compune acea selectie, nu doar totalul. */
export function VenituriComponentaList({ linii }: { linii: VenitLinie[] }) {
  const sortate = [...linii].sort((a, b) => (b.venit_realizat ?? 0) - (a.venit_realizat ?? 0));

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
        {sortate.map((l) => (
          <div key={l.id} className="rounded-md bg-surface-1 px-2.5 py-2 text-sm">
            <p className="truncate text-text-primary">{l.nume_client}</p>
            <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-text-muted">
              <span className="truncate">
                {l.produs ?? "—"} · {l.serviciu ?? "—"} ·{" "}
                {new Date(l.luna).toLocaleDateString("ro-RO", { month: "short", year: "numeric" })}
              </span>
              <span className="shrink-0 font-mono text-text-primary">
                {formatEur(l.venit_realizat ?? l.venit_estimat)}
              </span>
            </div>
          </div>
        ))}
        {sortate.length === 0 && (
          <p className="py-4 text-center text-xs text-text-muted">Niciun rezultat pentru selectia curenta.</p>
        )}
      </div>
    </div>
  );
}

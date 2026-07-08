"use client";

import { Filter } from "lucide-react";
import { formatEur } from "@/lib/format";
import type { ManagementMonthDatum } from "@/lib/management-analytics";

/** Compozitia lunara a KPI-urilor de Management - nu la nivel de linie
 * (Management agrega deja Venituri+Cheltuieli), ci pe luna, cu profitul
 * calculat pentru fiecare. */
export function ManagementComponentaList({ months }: { months: ManagementMonthDatum[] }) {
  const sortate = [...months].sort((a, b) => (a.luna < b.luna ? 1 : -1));

  return (
    <div className="rounded-xl border border-[#E8007A]/20 bg-[#E8007A]/[0.02] p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <Filter size={14} className="text-[#E8007A]" />
        <p className="text-sm font-medium text-text-primary">Compozitie pe luni</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-left text-[10px] uppercase text-text-muted">
              <th className="px-2 py-1.5">Luna</th>
              <th className="px-2 py-1.5 text-right">Venit realizat</th>
              <th className="px-2 py-1.5 text-right">Cheltuieli realizate</th>
              <th className="px-2 py-1.5 text-right">Profit</th>
            </tr>
          </thead>
          <tbody>
            {sortate.map((m) => (
              <tr key={m.luna} className="border-b border-border-faint">
                <td className="px-2 py-1.5 text-text-primary">{m.label}</td>
                <td className="px-2 py-1.5 text-right font-mono text-green-400">{formatEur(m.venitRealizat)}</td>
                <td className="px-2 py-1.5 text-right font-mono text-orange-400">{formatEur(m.cheltuieliRealizat)}</td>
                <td
                  className={`px-2 py-1.5 text-right font-mono ${
                    m.venitRealizat - m.cheltuieliRealizat >= 0 ? "text-text-primary" : "text-red-400"
                  }`}
                >
                  {formatEur(m.venitRealizat - m.cheltuieliRealizat)}
                </td>
              </tr>
            ))}
            {sortate.length === 0 && (
              <tr>
                <td colSpan={4} className="px-2 py-6 text-center text-xs text-text-muted">
                  Nicio luna in perioada selectata.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

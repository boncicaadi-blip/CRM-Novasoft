"use client";

import { useMemo, useState } from "react";
import { Wallet, AlertTriangle, TrendingUp, Clock } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CreanteImportForm } from "./CreanteImportForm";
import { CreantaDetailModal } from "./CreantaDetailModal";
import { formatEurCompact, formatEur } from "@/lib/format";
import { computeCreanteSummary, getCreantaStatus, getZileDepasire } from "@/lib/creante-analytics";
import type { Creanta, CreanteImportBatch } from "@/types/creante";

type StatusFilter = "toate" | "restanta" | "la_zi" | "incasata";

export function CreanteClient({
  creante,
  lastBatch,
}: {
  creante: Creanta[];
  lastBatch: CreanteImportBatch | null;
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("restanta");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Creanta | null>(null);

  const summary = useMemo(() => computeCreanteSummary(creante), [creante]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return creante.filter((c) => {
      if (q && !c.nume_firma.toLowerCase().includes(q) && !c.nr_factura.includes(q)) return false;
      if (statusFilter === "toate") return true;
      return getCreantaStatus(c) === statusFilter;
    });
  }, [creante, statusFilter, search]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-heading text-white">Creante</h1>
          <p className="text-sm text-slate-500">
            {lastBatch
              ? `Ultimul import: ${new Date(lastBatch.importat_la).toLocaleDateString("ro-RO")} (${lastBatch.nr_facturi_noi} noi, ${lastBatch.nr_facturi_actualizate} actualizate)`
              : "Niciun import inca."}
          </p>
        </div>
        <CreanteImportForm />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Sold total restant"
          value={formatEurCompact(summary.totalSold)}
          icon={<Wallet size={16} />}
          accent="#F59E0B"
        />
        <KpiCard
          label="Facturi restante"
          value={String(summary.nrFacturiRestante)}
          icon={<AlertTriangle size={16} />}
          accent="#EF4444"
        />
        <KpiCard
          label="Peste 60 zile"
          value={formatEurCompact(summary.sold61_90 + summary.sold90Plus)}
          icon={<Clock size={16} />}
          accent="#EF4444"
        />
        <KpiCard
          label="Total incasat"
          value={formatEurCompact(summary.totalIncasat)}
          icon={<TrendingUp size={16} />}
          accent="#22C55E"
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cauta firma sau nr. factura..."
          className="w-56 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white outline-none focus:border-[#E8007A]"
        />
        {(["restanta", "la_zi", "incasata", "toate"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
              statusFilter === s
                ? "bg-[#E8007A] text-[#0B0D1A]"
                : "border border-white/10 text-slate-400 hover:bg-white/5"
            }`}
          >
            {s === "restanta"
              ? "Restante"
              : s === "la_zi"
                ? "La zi"
                : s === "incasata"
                  ? "Incasate"
                  : "Toate"}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-left text-[11px] uppercase text-slate-500">
              <th className="px-3 py-2">Firma</th>
              <th className="px-3 py-2">Factura</th>
              <th className="px-3 py-2">Scadenta</th>
              <th className="px-3 py-2 text-right">Sold</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Comportament</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const status = getCreantaStatus(c);
              const zile = getZileDepasire(c);
              return (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="cursor-pointer border-b border-white/5 transition hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-2 text-white">{c.nume_firma}</td>
                  <td className="px-3 py-2 text-slate-400">{c.nr_factura}</td>
                  <td className="px-3 py-2 text-slate-400">
                    {c.data_scadenta
                      ? new Date(c.data_scadenta).toLocaleDateString("ro-RO")
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-white">
                    {formatEur(c.sold)}
                  </td>
                  <td className="px-3 py-2">
                    {status === "incasata" ? (
                      <span className="text-green-400">Incasata</span>
                    ) : status === "restanta" ? (
                      <span className="text-red-400">Restanta ({zile}z)</span>
                    ) : (
                      <span className="text-slate-400">La zi</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-400">{c.comportament_plata ?? "—"}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-slate-500">
                  Nicio factura gasita.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && <CreantaDetailModal creanta={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

"use client";

import { useMemo, useState, useTransition } from "react";
import { Wallet, AlertTriangle, Target, TrendingUp, Trash2 } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CreanteImportForm } from "./CreanteImportForm";
import { CreantaDetailModal } from "./CreantaDetailModal";
import { formatRonCompact, formatRon } from "@/lib/format";
import {
  computeCreanteSummary,
  getCreantaStatus,
  getZileDepasire,
  inPeriod,
  type PeriodFilter,
} from "@/lib/creante-analytics";
import { toggleProposSpreIncasareAction, deleteCreanteAction } from "@/lib/actions/creante";
import type { Creanta, CreanteImportBatch, CreantaIncasare } from "@/types/creante";

type StatusFilter = "toate" | "restanta" | "la_zi" | "incasata";

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "luna_curenta", label: "Luna curenta" },
  { value: "ultimele_3_luni", label: "Ultimele 3 luni" },
  { value: "anul_curent", label: "Anul curent" },
  { value: "toate", label: "Tot istoricul" },
];

export function CreanteClient({
  creante,
  lastBatch,
  incasari,
}: {
  creante: Creanta[];
  lastBatch: CreanteImportBatch | null;
  incasari: Record<string, CreantaIncasare[]>;
}) {
  const [period, setPeriod] = useState<PeriodFilter>("luna_curenta");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("restanta");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Creanta | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const inPeriodList = useMemo(
    () => creante.filter((c) => inPeriod(c, period)),
    [creante, period]
  );

  const summary = useMemo(() => computeCreanteSummary(inPeriodList), [inPeriodList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inPeriodList.filter((c) => {
      if (
        q &&
        !c.nume_firma.toLowerCase().includes(q) &&
        !c.nr_factura.includes(q) &&
        !(c.serviciu_facturat ?? "").toLowerCase().includes(q)
      ) {
        return false;
      }
      if (statusFilter === "toate") return true;
      return getCreantaStatus(c) === statusFilter;
    });
  }, [inPeriodList, statusFilter, search]);

  function toggleCheck(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCheckAll() {
    setCheckedIds((prev) =>
      prev.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id))
    );
  }

  function handleToggleProposSpreIncasare(c: Creanta, value: boolean) {
    startTransition(async () => {
      await toggleProposSpreIncasareAction(c.id, value);
    });
  }

  function handleDeleteSelected() {
    if (checkedIds.size === 0) return;
    if (!confirm(`Sigur stergi ${checkedIds.size} facturi selectate? Actiunea nu poate fi anulata.`))
      return;
    startTransition(async () => {
      const result = await deleteCreanteAction(Array.from(checkedIds));
      if (result.success) setCheckedIds(new Set());
    });
  }

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
          value={formatRonCompact(summary.totalSold)}
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
          label="Target propus (bifate)"
          value={formatRonCompact(summary.targetPropus)}
          icon={<Target size={16} />}
          accent="#E8007A"
        />
        <KpiCard
          label="Total incasat"
          value={formatRonCompact(summary.totalIncasat)}
          icon={<TrendingUp size={16} />}
          accent="#22C55E"
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
          className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-white outline-none focus:border-[#E8007A]"
        >
          {PERIOD_OPTIONS.map((p) => (
            <option key={p.value} value={p.value} style={{ backgroundColor: "#111535" }}>
              {p.label}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cauta firma, serviciu sau nr. factura..."
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
        {checkedIds.size > 0 && (
          <button
            onClick={handleDeleteSelected}
            disabled={isPending}
            className="ml-auto flex items-center gap-1.5 rounded-md bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            <Trash2 size={13} />
            Sterge {checkedIds.size} selectate
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-left text-[11px] uppercase text-slate-500">
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && checkedIds.size === filtered.length}
                  onChange={toggleCheckAll}
                  className="h-3.5 w-3.5 rounded border-white/20 bg-white/[0.04]"
                />
              </th>
              <th className="px-3 py-2">Firma</th>
              <th className="px-3 py-2">Serviciu</th>
              <th className="px-3 py-2">Tip vanzare</th>
              <th className="px-3 py-2">Factura</th>
              <th className="px-3 py-2">Data factura</th>
              <th className="px-3 py-2">Scadenta</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Sold</th>
              <th className="px-3 py-2">Zile depasire</th>
              <th className="px-3 py-2">Data incasare</th>
              <th className="px-3 py-2 text-center">Propus</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const zile = getZileDepasire(c);
              return (
                <tr
                  key={c.id}
                  className="border-b border-white/5 transition hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checkedIds.has(c.id)}
                      onChange={() => toggleCheck(c.id)}
                      className="h-3.5 w-3.5 rounded border-white/20 bg-white/[0.04]"
                    />
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2 text-white"
                    onClick={() => setSelected(c)}
                  >
                    {c.nume_firma}
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2 text-slate-400"
                    onClick={() => setSelected(c)}
                  >
                    {c.serviciu_facturat ?? "—"}
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2 text-slate-400"
                    onClick={() => setSelected(c)}
                  >
                    {c.tip_vanzare ?? "—"}
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2 text-slate-400"
                    onClick={() => setSelected(c)}
                  >
                    {c.nr_factura}
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2 text-slate-400"
                    onClick={() => setSelected(c)}
                  >
                    {c.data_factura ? new Date(c.data_factura).toLocaleDateString("ro-RO") : "—"}
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2 text-slate-400"
                    onClick={() => setSelected(c)}
                  >
                    {c.data_scadenta ? new Date(c.data_scadenta).toLocaleDateString("ro-RO") : "—"}
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2 text-right font-mono text-slate-300"
                    onClick={() => setSelected(c)}
                  >
                    {formatRon(c.total_factura)}
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2 text-right font-mono text-white"
                    onClick={() => setSelected(c)}
                  >
                    {formatRon(c.sold)}
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2 text-slate-400"
                    onClick={() => setSelected(c)}
                  >
                    {zile ? (
                      <span className={zile > 60 ? "text-red-400" : "text-amber-400"}>
                        {zile}z
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td
                    className="cursor-pointer px-3 py-2 text-slate-400"
                    onClick={() => setSelected(c)}
                  >
                    {c.data_incasare ? new Date(c.data_incasare).toLocaleDateString("ro-RO") : "—"}
                  </td>
                  <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={c.propus_spre_incasare}
                      onChange={(e) => handleToggleProposSpreIncasare(c, e.target.checked)}
                      disabled={c.sold <= 0}
                      className="h-3.5 w-3.5 rounded border-white/20 bg-white/[0.04] accent-[#E8007A] disabled:opacity-30"
                      title={c.sold <= 0 ? "Factura deja incasata" : "Propus spre incasare"}
                    />
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} className="px-3 py-8 text-center text-sm text-slate-500">
                  Nicio factura gasita.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <CreantaDetailModal
          creanta={selected}
          incasari={incasari[selected.id] ?? []}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

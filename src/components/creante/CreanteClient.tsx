"use client";

import { useMemo, useState, useTransition, useRef } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  Wallet,
  AlertTriangle,
  Target,
  TrendingUp,
  Trash2,
  Download,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CreanteImportForm } from "./CreanteImportForm";
import { CreantaDetailModal } from "./CreantaDetailModal";
import { AgingBar } from "./AgingBar";
import { formatRonCompact, formatRon } from "@/lib/format";
import {
  computeCreanteSummary,
  getCreantaStatus,
  getZileDepasire,
  inPeriod,
  type PeriodFilter,
} from "@/lib/creante-analytics";
import { toggleProposSpreIncasareAction, deleteCreanteAction, deleteAllCreanteAction } from "@/lib/actions/creante";
import type { Creanta, CreanteImportBatch, CreantaIncasare } from "@/types/creante";

type StatusFilter = "toate" | "restanta" | "la_zi" | "incasata";
type SortKey =
  | "firma"
  | "serviciu"
  | "tip_vanzare"
  | "nr_factura"
  | "data_factura"
  | "data_scadenta"
  | "total_factura"
  | "sold"
  | "zile_depasire"
  | "data_incasare";
type SortDir = "asc" | "desc";

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "luna_curenta", label: "Luna curenta" },
  { value: "ultimele_3_luni", label: "Ultimele 3 luni" },
  { value: "anul_curent", label: "Anul curent" },
  { value: "toate", label: "Tot istoricul" },
  { value: "custom", label: "Perioada personalizata" },
];

interface ColumnDef {
  key: string;
  label: string;
  width: number;
  align?: "right" | "center";
  sortKey?: SortKey;
}

const DEFAULT_COLUMNS: ColumnDef[] = [
  { key: "firma", label: "Firma", width: 170, sortKey: "firma" },
  { key: "serviciu", label: "Serviciu", width: 140, sortKey: "serviciu" },
  { key: "tip_vanzare", label: "Tip vanzare", width: 100, sortKey: "tip_vanzare" },
  { key: "nr_factura", label: "Factura", width: 85, sortKey: "nr_factura" },
  { key: "data_factura", label: "Data factura", width: 95, sortKey: "data_factura" },
  { key: "data_scadenta", label: "Scadenta", width: 95, sortKey: "data_scadenta" },
  { key: "total_factura", label: "Total", width: 90, align: "right", sortKey: "total_factura" },
  { key: "sold", label: "Sold", width: 90, align: "right", sortKey: "sold" },
  { key: "zile_depasire", label: "Zile dep.", width: 75, align: "right", sortKey: "zile_depasire" },
  { key: "data_incasare", label: "Data incasare", width: 100, sortKey: "data_incasare" },
  { key: "propus", label: "Propus", width: 60, align: "center" },
];

function sortValue(c: Creanta, key: SortKey): string | number {
  switch (key) {
    case "firma":
      return c.nume_firma.toLowerCase();
    case "serviciu":
      return (c.serviciu_facturat ?? "").toLowerCase();
    case "tip_vanzare":
      return c.tip_vanzare ?? "";
    case "nr_factura":
      return Number(c.nr_factura) || 0;
    case "data_factura":
      return c.data_factura ?? "";
    case "data_scadenta":
      return c.data_scadenta ?? "";
    case "total_factura":
      return c.total_factura;
    case "sold":
      return c.sold;
    case "zile_depasire":
      return getZileDepasire(c) ?? -1;
    case "data_incasare":
      return c.data_incasare ?? "";
    default:
      return "";
  }
}

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
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("restanta");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Creanta | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [colWidths, setColWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(DEFAULT_COLUMNS.map((c) => [c.key, c.width]))
  );
  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);
  const [pageSize, setPageSize] = useState<number | "toate">(50);
  const [page, setPage] = useState(1);

  const inPeriodList = useMemo(
    () => creante.filter((c) => inPeriod(c, period, { from: customFrom, to: customTo })),
    [creante, period, customFrom, customTo]
  );

  const summary = useMemo(() => computeCreanteSummary(inPeriodList), [inPeriodList]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = inPeriodList.filter((c) => {
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
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const va = sortValue(a, sortKey);
        const vb = sortValue(b, sortKey);
        const cmp = va < vb ? -1 : va > vb ? 1 : 0;
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [inPeriodList, statusFilter, search, sortKey, sortDir]);

  const totalPages = pageSize === "toate" ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedRows = useMemo(() => {
    if (pageSize === "toate") return filtered;
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

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

  function handleDeleteAll() {
    const confirmation = prompt(
      `Scrie STERGE ca sa confirmi stergerea COMPLETA a tuturor celor ${creante.length} facturi din Creante. Actiunea nu poate fi anulata.`
    );
    if (confirmation !== "STERGE") return;
    startTransition(async () => {
      const result = await deleteAllCreanteAction();
      if (result.success) setCheckedIds(new Set());
    });
  }

  function handleExport() {
    const rows = filtered.map((c) => ({
      Firma: c.nume_firma,
      Serviciu: c.serviciu_facturat ?? "",
      "Tip vanzare": c.tip_vanzare ?? "",
      "Nr factura": c.nr_factura,
      "Data factura": c.data_factura ?? "",
      "Data scadenta": c.data_scadenta ?? "",
      "Total factura": c.total_factura,
      Sold: c.sold,
      "Data incasare": c.data_incasare ?? "",
      "Nr zile depasire": getZileDepasire(c) ?? "",
      "Propus spre incasare": c.propus_spre_incasare ? "DA" : "NU",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Creante");
    XLSX.writeFile(wb, `creante_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function startResize(key: string, e: React.MouseEvent) {
    e.preventDefault();
    resizingRef.current = { key, startX: e.clientX, startWidth: colWidths[key] };
    window.addEventListener("mousemove", handleResizeMove);
    window.addEventListener("mouseup", stopResize);
  }

  function handleResizeMove(e: MouseEvent) {
    const r = resizingRef.current;
    if (!r) return;
    const newWidth = Math.max(50, r.startWidth + (e.clientX - r.startX));
    setColWidths((prev) => ({ ...prev, [r.key]: newWidth }));
  }

  function stopResize() {
    resizingRef.current = null;
    window.removeEventListener("mousemove", handleResizeMove);
    window.removeEventListener("mouseup", stopResize);
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

      <AgingBar summary={summary} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={period}
          onChange={(e) => {
            setPeriod(e.target.value as PeriodFilter);
            setPage(1);
          }}
          className="rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-white outline-none focus:border-[#E8007A]"
        >
          {PERIOD_OPTIONS.map((p) => (
            <option key={p.value} value={p.value} style={{ backgroundColor: "#111535" }}>
              {p.label}
            </option>
          ))}
        </select>
        {period === "custom" && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => {
                setCustomFrom(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-white outline-none focus:border-[#E8007A]"
            />
            <span className="text-xs text-slate-500">-</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => {
                setCustomTo(e.target.value);
                setPage(1);
              }}
              className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs text-white outline-none focus:border-[#E8007A]"
            />
          </>
        )}
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Cauta firma, serviciu sau nr. factura..."
          className="w-56 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white outline-none focus:border-[#E8007A]"
        />
        {(["restanta", "la_zi", "incasata", "toate"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
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
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/5"
        >
          <Download size={13} />
          Export Excel
        </button>
        <button
          onClick={handleDeleteAll}
          disabled={isPending || creante.length === 0}
          className="flex items-center gap-1.5 rounded-md border border-red-500/20 px-2.5 py-1.5 text-xs font-medium text-red-400/80 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
        >
          <Trash2 size={13} />
          Sterge tot
        </button>
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
        <table className="text-sm" style={{ tableLayout: "fixed", width: "max-content" }}>
          <colgroup>
            <col style={{ width: 32 }} />
            {DEFAULT_COLUMNS.map((c) => (
              <col key={c.key} style={{ width: colWidths[c.key] }} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-left text-[10px] uppercase text-slate-500">
              <th className="px-2 py-1.5">
                <input
                  type="checkbox"
                  checked={filtered.length > 0 && checkedIds.size === filtered.length}
                  onChange={toggleCheckAll}
                  className="h-3.5 w-3.5 rounded border-white/20 bg-white/[0.04]"
                />
              </th>
              {DEFAULT_COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className={`relative select-none px-2 py-1.5 ${col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"} ${col.sortKey ? "cursor-pointer hover:text-slate-300" : ""}`}
                  onClick={() => col.sortKey && handleSort(col.sortKey)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortKey && sortKey === col.sortKey && (
                      sortDir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />
                    )}
                  </span>
                  <div
                    onMouseDown={(e) => startResize(col.key, e)}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-[#E8007A]/50"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((c) => {
              const zile = getZileDepasire(c);
              return (
                <tr
                  key={c.id}
                  className="border-b border-white/5 transition hover:bg-white/[0.03]"
                >
                  <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checkedIds.has(c.id)}
                      onChange={() => toggleCheck(c.id)}
                      className="h-3.5 w-3.5 rounded border-white/20 bg-white/[0.04]"
                    />
                  </td>
                  <td className="truncate px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/creante/client/${encodeURIComponent(c.nume_firma)}`}
                      className="text-white hover:text-[#E8007A] hover:underline"
                    >
                      {c.nume_firma}
                    </Link>
                  </td>
                  <td
                    className="cursor-pointer truncate px-2 py-1.5 text-slate-400"
                    onClick={() => setSelected(c)}
                  >
                    {c.serviciu_facturat ?? "—"}
                  </td>
                  <td
                    className="cursor-pointer truncate px-2 py-1.5 text-slate-400"
                    onClick={() => setSelected(c)}
                  >
                    {c.tip_vanzare ?? "—"}
                  </td>
                  <td
                    className="cursor-pointer truncate px-2 py-1.5 text-slate-400"
                    onClick={() => setSelected(c)}
                  >
                    {c.nr_factura}
                  </td>
                  <td
                    className="cursor-pointer truncate px-2 py-1.5 text-slate-400"
                    onClick={() => setSelected(c)}
                  >
                    {c.data_factura ? new Date(c.data_factura).toLocaleDateString("ro-RO") : "—"}
                  </td>
                  <td
                    className="cursor-pointer truncate px-2 py-1.5 text-slate-400"
                    onClick={() => setSelected(c)}
                  >
                    {c.data_scadenta ? new Date(c.data_scadenta).toLocaleDateString("ro-RO") : "—"}
                  </td>
                  <td
                    className="cursor-pointer truncate px-2 py-1.5 text-right font-mono text-slate-300"
                    onClick={() => setSelected(c)}
                  >
                    {formatRon(c.total_factura)}
                  </td>
                  <td
                    className="cursor-pointer truncate px-2 py-1.5 text-right font-mono text-white"
                    onClick={() => setSelected(c)}
                  >
                    {formatRon(c.sold)}
                  </td>
                  <td
                    className="cursor-pointer truncate px-2 py-1.5 text-right text-slate-400"
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
                    className="cursor-pointer truncate px-2 py-1.5 text-slate-400"
                    onClick={() => setSelected(c)}
                  >
                    {c.data_incasare ? new Date(c.data_incasare).toLocaleDateString("ro-RO") : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
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

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span>Randuri pe pagina:</span>
          {[25, 50, 100, "toate" as const].map((size) => (
            <button
              key={size}
              onClick={() => {
                setPageSize(size);
                setPage(1);
              }}
              className={`rounded-md px-2 py-1 font-medium transition ${
                pageSize === size
                  ? "bg-[#E8007A] text-[#0B0D1A]"
                  : "border border-white/10 text-slate-400 hover:bg-white/5"
              }`}
            >
              {size === "toate" ? "Toate" : size}
            </button>
          ))}
        </div>
        {pageSize !== "toate" && (
          <div className="flex items-center gap-2">
            <span>
              {filtered.length === 0
                ? "0 rezultate"
                : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, filtered.length)} din ${filtered.length}`}
            </span>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-white/10 p-1 transition hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <span>
              Pagina {page} din {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-white/10 p-1 transition hover:bg-white/5 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
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

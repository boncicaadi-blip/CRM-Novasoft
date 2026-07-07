"use client";

import { useMemo, useState, useTransition, useRef } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  Wallet,
  AlertTriangle,
  Target,
  TrendingDown,
  Trash2,
  Download,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
} from "lucide-react";
import { KpiInfoCard } from "@/components/ui/KpiInfoCard";
import { MonthMultiSelect } from "@/components/ui/MonthMultiSelect";
import { ObligatiiImportForm } from "./ObligatiiImportForm";
import { ObligatieDetailModal } from "./ObligatieDetailModal";
import { AgingBarObligatii } from "./AgingBarObligatii";
import { formatRon } from "@/lib/format";
import { OBLIGATII_KPI_DEFINITIONS } from "@/lib/obligatii-kpi-definitions";
import {
  computeObligatiiSummary,
  computeTotalPlatitInPeriod,
  dateMatchesPeriod,
  getObligatieStatus,
  getZileDepasireObligatie,
  getValoarePropusaObligatie,
  isPartialPropusObligatie,
  inPeriodObligatie,
  matchesAgingBucketObligatie,
  type PeriodFilter,
  type AgingBucketObligatie,
} from "@/lib/obligatii-analytics";
import {
  toggleProposSprePlataAction,
  deleteObligatiiAction,
  deleteAllObligatiiAction,
} from "@/lib/actions/obligatii";
import type { Obligatie, ObligatiiImportBatch, ObligatiePlata } from "@/types/obligatii";

type StatusFilter = "toate" | "restanta" | "la_zi" | "platita";
type SortKey =
  | "furnizor"
  | "serviciu"
  | "tip_achizitie"
  | "nr_factura"
  | "data_factura"
  | "data_scadenta"
  | "total_factura"
  | "sold"
  | "zile_depasire"
  | "data_plata";
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
  { key: "furnizor", label: "Furnizor", width: 170, sortKey: "furnizor" },
  { key: "serviciu", label: "Serviciu", width: 140, sortKey: "serviciu" },
  { key: "tip_achizitie", label: "Tip achizitie", width: 100, sortKey: "tip_achizitie" },
  { key: "nr_factura", label: "Factura", width: 100, sortKey: "nr_factura" },
  { key: "data_factura", label: "Data factura", width: 95, sortKey: "data_factura" },
  { key: "data_scadenta", label: "Scadenta", width: 95, sortKey: "data_scadenta" },
  { key: "total_factura", label: "Total", width: 90, align: "right", sortKey: "total_factura" },
  { key: "sold", label: "Sold", width: 90, align: "right", sortKey: "sold" },
  { key: "zile_depasire", label: "Zile dep.", width: 75, align: "right", sortKey: "zile_depasire" },
  { key: "data_plata", label: "Data plata", width: 95, sortKey: "data_plata" },
  { key: "propus", label: "Propus", width: 60, align: "center" },
];

function sortValue(o: Obligatie, key: SortKey): string | number {
  switch (key) {
    case "furnizor":
      return o.nume_furnizor.toLowerCase();
    case "serviciu":
      return (o.serviciu_facturat ?? "").toLowerCase();
    case "tip_achizitie":
      return o.tip_achizitie ?? "";
    case "nr_factura":
      return o.nr_factura.toLowerCase();
    case "data_factura":
      return o.data_factura ?? "";
    case "data_scadenta":
      return o.data_scadenta ?? "";
    case "total_factura":
      return o.total_factura;
    case "sold":
      return o.sold;
    case "zile_depasire":
      return getZileDepasireObligatie(o) ?? -1;
    case "data_plata":
      return o.data_plata ?? "";
    default:
      return "";
  }
}

export function ObligatiiClient({
  obligatii,
  lastBatch,
  plati,
}: {
  obligatii: Obligatie[];
  lastBatch: ObligatiiImportBatch | null;
  plati: Record<string, ObligatiePlata[]>;
}) {
  const [period, setPeriod] = useState<PeriodFilter>("luna_curenta");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customMonths, setCustomMonths] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("restanta");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Obligatie | null>(null);
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
  const [proposOverrides, setProposOverrides] = useState<Record<string, boolean>>({});
  const [agingFilter, setAgingFilter] = useState<AgingBucketObligatie | null>(null);
  const [expandedKpi, setExpandedKpi] = useState<
    "soldRestant" | "targetPropus" | "totalPlatit" | null
  >(null);
  const [onlyPartial, setOnlyPartial] = useState(false);
  const [viewMode, setViewMode] = useState<"facturi" | "furnizor">("facturi");

  const obligatiiEffective = useMemo(() => {
    if (Object.keys(proposOverrides).length === 0) return obligatii;
    return obligatii.map((o) =>
      o.id in proposOverrides ? { ...o, propus_spre_plata: proposOverrides[o.id] } : o
    );
  }, [obligatii, proposOverrides]);

  const inPeriodList = useMemo(
    () =>
      obligatiiEffective.filter((o) => inPeriodObligatie(o, period, { from: customFrom, to: customTo, months: customMonths })),
    [obligatiiEffective, period, customFrom, customTo, customMonths]
  );

  // Sold restant, facturi restante si target sunt stari CURENTE, nu legate
  // de perioada - se calculeaza pe toate facturile.
  const summary = useMemo(() => computeObligatiiSummary(obligatiiEffective), [obligatiiEffective]);

  // Total platit E legat de perioada, dupa data platii (din jurnal), nu
  // dupa data facturii.
  const platiFlat = useMemo(() => Object.values(plati).flat(), [plati]);
  const totalPlatitInPeriod = useMemo(
    () => computeTotalPlatitInPeriod(platiFlat, period, { from: customFrom, to: customTo, months: customMonths }),
    [platiFlat, period, customFrom, customTo, customMonths]
  );

  // Desfasuratoare pentru fiecare KPI clicabil.
  const obligatieById = useMemo(
    () => new Map(obligatiiEffective.map((o) => [o.id, o])),
    [obligatiiEffective]
  );
  const breakdownSoldRestant = useMemo(
    () => obligatiiEffective.filter((o) => getObligatieStatus(o) === "restanta"),
    [obligatiiEffective]
  );
  const breakdownTargetPropus = useMemo(
    () => obligatiiEffective.filter((o) => o.propus_spre_plata && o.sold > 0),
    [obligatiiEffective]
  );
  const breakdownTotalPlatit = useMemo(
    () =>
      platiFlat.filter((p) => dateMatchesPeriod(p.data_plata, period, { from: customFrom, to: customTo, months: customMonths })),
    [platiFlat, period, customFrom, customTo, customMonths]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = inPeriodList.filter((o) => {
      if (
        q &&
        !o.nume_furnizor.toLowerCase().includes(q) &&
        !o.nr_factura.toLowerCase().includes(q) &&
        !(o.serviciu_facturat ?? "").toLowerCase().includes(q)
      ) {
        return false;
      }
      if (agingFilter && !matchesAgingBucketObligatie(o, agingFilter)) return false;
      if (onlyPartial && !isPartialPropusObligatie(o)) return false;
      if (statusFilter === "toate") return true;
      return getObligatieStatus(o) === statusFilter;
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
  }, [inPeriodList, statusFilter, search, sortKey, sortDir, agingFilter, onlyPartial]);

  // Grupare pe furnizor - respecta toate filtrele active.
  const furnizorGroups = useMemo(() => {
    const map = new Map<
      string,
      { numeFurnizor: string; nrFacturi: number; totalFacturat: number; sold: number; platit: number }
    >();
    for (const o of filtered) {
      const g = map.get(o.nume_furnizor) ?? {
        numeFurnizor: o.nume_furnizor,
        nrFacturi: 0,
        totalFacturat: 0,
        sold: 0,
        platit: 0,
      };
      g.nrFacturi += 1;
      g.totalFacturat += o.total_factura;
      g.sold += o.sold;
      g.platit += o.valoare_platita;
      map.set(o.nume_furnizor, g);
    }
    return Array.from(map.values()).sort((a, b) => b.sold - a.sold);
  }, [filtered]);

  // Totalul pentru exact ce e afisat acum, cu toate filtrele active.
  const filteredTotals = useMemo(() => {
    let totalSold = 0;
    let totalFacturat = 0;
    for (const o of filtered) {
      totalSold += o.sold;
      totalFacturat += o.total_factura;
    }
    return { count: filtered.length, totalSold, totalFacturat };
  }, [filtered]);

  const totalPages = pageSize === "toate" ? 1 : Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedRows = useMemo(() => {
    if (pageSize === "toate") return filtered;
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  function handleAgingBucketClick(bucket: AgingBucketObligatie) {
    setAgingFilter((prev) => (prev === bucket ? null : bucket));
    setPage(1);
  }

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
      prev.size === filtered.length ? new Set() : new Set(filtered.map((o) => o.id))
    );
  }

  function handleToggleProposSprePlata(o: Obligatie, value: boolean) {
    setProposOverrides((prev) => ({ ...prev, [o.id]: value }));
    startTransition(async () => {
      const result = await toggleProposSprePlataAction(o.id, value);
      if (!result.success) {
        setProposOverrides((prev) => ({ ...prev, [o.id]: o.propus_spre_plata }));
      }
    });
  }

  function handleDeleteSelected() {
    if (checkedIds.size === 0) return;
    if (!confirm(`Sigur stergi ${checkedIds.size} facturi selectate? Actiunea nu poate fi anulata.`))
      return;
    startTransition(async () => {
      const result = await deleteObligatiiAction(Array.from(checkedIds));
      if (result.success) setCheckedIds(new Set());
    });
  }

  function handleDeleteAll() {
    const confirmation = prompt(
      `Scrie STERGE ca sa confirmi stergerea COMPLETA a tuturor celor ${obligatii.length} facturi din Obligatii. Actiunea nu poate fi anulata.`
    );
    if (confirmation !== "STERGE") return;
    startTransition(async () => {
      const result = await deleteAllObligatiiAction();
      if (result.success) setCheckedIds(new Set());
    });
  }

  function handleExport() {
    const rows = filtered.map((o) => ({
      Furnizor: o.nume_furnizor,
      Serviciu: o.serviciu_facturat ?? "",
      "Tip achizitie": o.tip_achizitie ?? "",
      "Nr factura": o.nr_factura,
      "Data factura": o.data_factura ?? "",
      "Data scadenta": o.data_scadenta ?? "",
      "Total factura": o.total_factura,
      Sold: o.sold,
      "Data plata": o.data_plata ?? "",
      "Nr zile depasire": getZileDepasireObligatie(o) ?? "",
      "Propus spre plata": o.propus_spre_plata ? "DA" : "NU",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Obligatii");
    XLSX.writeFile(wb, `obligatii_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
          <h1 className="text-lg font-heading text-white">Obligatii</h1>
          <p className="text-sm text-slate-500">
            {lastBatch
              ? `Ultimul import: ${new Date(lastBatch.importat_la).toLocaleDateString("ro-RO")} (${lastBatch.nr_facturi_noi} noi, ${lastBatch.nr_facturi_actualizate} actualizate)`
              : "Niciun import inca."}
          </p>
        </div>
        <ObligatiiImportForm />
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiInfoCard
          label="Sold total restant"
          value={formatRon(summary.totalSoldRestant)}
          sublabel={`${summary.nrFacturiRestante} facturi — click pentru desfasurator`}
          icon={<Wallet size={16} />}
          accent="#F59E0B"
          definition={OBLIGATII_KPI_DEFINITIONS.soldRestant}
          onClick={() => setExpandedKpi((k) => (k === "soldRestant" ? null : "soldRestant"))}
          isActive={expandedKpi === "soldRestant"}
        />
        <KpiInfoCard
          label="Facturi restante"
          value={String(summary.nrFacturiRestante)}
          sublabel="click pentru desfasurator"
          icon={<AlertTriangle size={16} />}
          accent="#EF4444"
          definition={OBLIGATII_KPI_DEFINITIONS.facturiRestante}
          onClick={() => setExpandedKpi((k) => (k === "soldRestant" ? null : "soldRestant"))}
          isActive={expandedKpi === "soldRestant"}
        />
        <KpiInfoCard
          label="Target propus (bifate)"
          value={formatRon(summary.targetPropus)}
          sublabel={`${summary.nrFacturiPropuse} facturi — click pentru desfasurator`}
          icon={<Target size={16} />}
          accent="#E8007A"
          definition={OBLIGATII_KPI_DEFINITIONS.targetPropus}
          onClick={() => setExpandedKpi((k) => (k === "targetPropus" ? null : "targetPropus"))}
          isActive={expandedKpi === "targetPropus"}
        />
        <KpiInfoCard
          label="Total platit"
          value={formatRon(totalPlatitInPeriod)}
          sublabel={`${breakdownTotalPlatit.length} plati — click pentru desfasurator`}
          icon={<TrendingDown size={16} />}
          accent="#22C55E"
          definition={OBLIGATII_KPI_DEFINITIONS.totalPlatit}
          onClick={() => setExpandedKpi((k) => (k === "totalPlatit" ? null : "totalPlatit"))}
          isActive={expandedKpi === "totalPlatit"}
        />
      </div>

      {expandedKpi && (
        <div className="mb-5 rounded-xl border border-[#E8007A]/20 bg-white/[0.02] p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-[#E8007A]">
              {expandedKpi === "soldRestant" && "Desfasurator — facturi restante"}
              {expandedKpi === "targetPropus" && "Desfasurator — facturi propuse spre plata"}
              {expandedKpi === "totalPlatit" && "Desfasurator — plati in perioada selectata"}
            </p>
            <button
              onClick={() => setExpandedKpi(null)}
              className="rounded-md p-1 text-slate-500 hover:text-white"
            >
              <X size={16} />
            </button>
          </div>

          {expandedKpi !== "totalPlatit" ? (
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase text-slate-500">
                    <th className="px-2 py-1.5">Furnizor</th>
                    <th className="px-2 py-1.5">Factura</th>
                    <th className="px-2 py-1.5">Scadenta</th>
                    <th className="px-2 py-1.5 text-right">
                      {expandedKpi === "targetPropus" ? "Valoare propusa" : "Sold"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(expandedKpi === "soldRestant" ? breakdownSoldRestant : breakdownTargetPropus).map(
                    (o) => (
                      <tr
                        key={o.id}
                        onClick={() => setSelected(o)}
                        className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]"
                      >
                        <td className="px-2 py-1.5 text-white">{o.nume_furnizor}</td>
                        <td className="px-2 py-1.5 text-slate-400">{o.nr_factura}</td>
                        <td className="px-2 py-1.5 text-slate-400">
                          {o.data_scadenta ? new Date(o.data_scadenta).toLocaleDateString("ro-RO") : "—"}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-white">
                          {formatRon(expandedKpi === "targetPropus" ? getValoarePropusaObligatie(o) : o.sold)}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase text-slate-500">
                    <th className="px-2 py-1.5">Furnizor</th>
                    <th className="px-2 py-1.5">Factura</th>
                    <th className="px-2 py-1.5">Data platii</th>
                    <th className="px-2 py-1.5 text-right">Valoare platita</th>
                  </tr>
                </thead>
                <tbody>
                  {breakdownTotalPlatit.map((p) => {
                    const o = obligatieById.get(p.obligatie_id);
                    return (
                      <tr
                        key={p.id}
                        onClick={() => o && setSelected(o)}
                        className="cursor-pointer border-t border-white/5 hover:bg-white/[0.03]"
                      >
                        <td className="px-2 py-1.5 text-white">{o?.nume_furnizor ?? "—"}</td>
                        <td className="px-2 py-1.5 text-slate-400">{o?.nr_factura ?? "—"}</td>
                        <td className="px-2 py-1.5 text-slate-400">
                          {new Date(p.data_plata).toLocaleDateString("ro-RO")}
                        </td>
                        <td className="px-2 py-1.5 text-right font-mono text-white">
                          {formatRon(p.valoare)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <AgingBarObligatii
        summary={summary}
        activeBucket={agingFilter}
        onBucketClick={handleAgingBucketClick}
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={period}
          onChange={(e) => {
            const next = e.target.value as PeriodFilter;
            setPeriod(next);
            setPage(1);
            if (next === "custom" && (!customFrom || !customTo)) {
              const now = new Date();
              const start = new Date(now.getFullYear(), now.getMonth(), 1);
              const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
              setCustomFrom(start.toISOString().slice(0, 10));
              setCustomTo(end.toISOString().slice(0, 10));
            }
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
            <MonthMultiSelect
              selected={customMonths}
              onChange={(months) => {
                setCustomMonths(months);
                setPage(1);
              }}
            />
            <span className="text-[10px] text-slate-600">sau interval:</span>
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
          placeholder="Cauta furnizor, serviciu sau nr. factura..."
          className="w-56 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white outline-none focus:border-[#E8007A]"
        />
        {(["restanta", "la_zi", "platita", "toate"] as StatusFilter[]).map((s) => (
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
                : s === "platita"
                  ? "Platite"
                  : "Toate"}
          </button>
        ))}
        <button
          onClick={() => setOnlyPartial((v) => !v)}
          className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
            onlyPartial
              ? "bg-[#E8007A] text-[#0B0D1A]"
              : "border border-white/10 text-slate-400 hover:bg-white/5"
          }`}
          title="Facturi propuse spre plata pentru mai putin decat soldul integral"
        >
          <Target size={13} />
          Propuse partial
        </button>
        <div className="flex items-center rounded-md border border-white/10 p-0.5">
          <button
            onClick={() => setViewMode("facturi")}
            className={`rounded px-2 py-1 text-xs font-medium transition ${
              viewMode === "facturi" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            Pe facturi
          </button>
          <button
            onClick={() => setViewMode("furnizor")}
            className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition ${
              viewMode === "furnizor" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <Users size={12} />
            Pe furnizor
          </button>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/5"
        >
          <Download size={13} />
          Export Excel
        </button>
        <button
          onClick={handleDeleteAll}
          disabled={isPending || obligatii.length === 0}
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

      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">
            Facturi pentru filtrul curent
          </p>
          <p className="font-mono text-xl font-semibold text-white">{filteredTotals.count}</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Total facturat</p>
          <p className="font-mono text-xl font-semibold text-white">
            {formatRon(filteredTotals.totalFacturat)}
          </p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2">
          <p className="text-[11px] uppercase tracking-wide text-slate-500">Sold</p>
          <p className="font-mono text-xl font-semibold text-white">
            {formatRon(filteredTotals.totalSold)}
          </p>
        </div>
      </div>

      {viewMode === "facturi" && (
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
            {pagedRows.map((o) => {
              const zile = getZileDepasireObligatie(o);
              return (
                <tr key={o.id} className="border-b border-white/5 transition hover:bg-white/[0.03]">
                  <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checkedIds.has(o.id)}
                      onChange={() => toggleCheck(o.id)}
                      className="h-3.5 w-3.5 rounded border-white/20 bg-white/[0.04]"
                    />
                  </td>
                  <td className="truncate px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/obligatii/furnizor/${encodeURIComponent(o.nume_furnizor)}`}
                      className="text-white hover:text-[#E8007A] hover:underline"
                    >
                      {o.nume_furnizor}
                    </Link>
                  </td>
                  <td
                    className="cursor-pointer truncate px-2 py-1.5 text-slate-400"
                    onClick={() => setSelected(o)}
                  >
                    {o.serviciu_facturat ?? "—"}
                  </td>
                  <td
                    className="cursor-pointer truncate px-2 py-1.5 text-slate-400"
                    onClick={() => setSelected(o)}
                  >
                    {o.tip_achizitie ?? "—"}
                  </td>
                  <td
                    className="cursor-pointer truncate px-2 py-1.5 text-slate-400"
                    onClick={() => setSelected(o)}
                  >
                    {o.nr_factura}
                  </td>
                  <td
                    className="cursor-pointer truncate px-2 py-1.5 text-slate-400"
                    onClick={() => setSelected(o)}
                  >
                    {o.data_factura ? new Date(o.data_factura).toLocaleDateString("ro-RO") : "—"}
                  </td>
                  <td
                    className="cursor-pointer truncate px-2 py-1.5 text-slate-400"
                    onClick={() => setSelected(o)}
                  >
                    {o.data_scadenta ? new Date(o.data_scadenta).toLocaleDateString("ro-RO") : "—"}
                  </td>
                  <td
                    className="cursor-pointer truncate px-2 py-1.5 text-right font-mono text-slate-300"
                    onClick={() => setSelected(o)}
                  >
                    {formatRon(o.total_factura)}
                  </td>
                  <td
                    className="cursor-pointer truncate px-2 py-1.5 text-right font-mono text-white"
                    onClick={() => setSelected(o)}
                  >
                    {formatRon(o.sold)}
                  </td>
                  <td
                    className="cursor-pointer truncate px-2 py-1.5 text-right text-slate-400"
                    onClick={() => setSelected(o)}
                  >
                    {zile ? (
                      <span className={zile > 60 ? "text-red-400" : "text-amber-400"}>{zile}z</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td
                    className="cursor-pointer truncate px-2 py-1.5 text-slate-400"
                    onClick={() => setSelected(o)}
                  >
                    {o.data_plata ? new Date(o.data_plata).toLocaleDateString("ro-RO") : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="relative inline-block">
                      <input
                        type="checkbox"
                        checked={o.propus_spre_plata}
                        onChange={(e) => handleToggleProposSprePlata(o, e.target.checked)}
                        disabled={o.sold <= 0}
                        className="h-3.5 w-3.5 rounded border-white/20 bg-white/[0.04] accent-[#E8007A] disabled:opacity-30"
                        title={
                          o.sold <= 0
                            ? "Factura deja platita"
                            : isPartialPropusObligatie(o)
                              ? `Propus partial: ${formatRon(getValoarePropusaObligatie(o))} din ${formatRon(o.sold)}`
                              : "Propus spre plata"
                        }
                      />
                      {isPartialPropusObligatie(o) && (
                        <span
                          className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-400"
                          title={`Propus partial: ${formatRon(getValoarePropusaObligatie(o))} din ${formatRon(o.sold)}`}
                        />
                      )}
                    </div>
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
      )}

      {viewMode === "furnizor" && (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-left text-[10px] uppercase text-slate-500">
                <th className="px-3 py-2">Furnizor</th>
                <th className="px-3 py-2 text-right">Nr facturi</th>
                <th className="px-3 py-2 text-right">Total facturat</th>
                <th className="px-3 py-2 text-right">Total platit</th>
                <th className="px-3 py-2 text-right">Sold restant</th>
              </tr>
            </thead>
            <tbody>
              {furnizorGroups.map((g) => (
                <tr key={g.numeFurnizor} className="border-b border-white/5 hover:bg-white/[0.03]">
                  <td className="px-3 py-2">
                    <Link
                      href={`/obligatii/furnizor/${encodeURIComponent(g.numeFurnizor)}`}
                      className="text-white hover:text-[#E8007A] hover:underline"
                    >
                      {g.numeFurnizor}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right text-slate-400">{g.nrFacturi}</td>
                  <td className="px-3 py-2 text-right font-mono text-slate-300">
                    {formatRon(g.totalFacturat)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-green-400">
                    {formatRon(g.platit)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-white">{formatRon(g.sold)}</td>
                </tr>
              ))}
              {furnizorGroups.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-sm text-slate-500">
                    Niciun furnizor gasit.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === "facturi" && (
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
      )}

      {selected && (
        <ObligatieDetailModal
          obligatie={selected}
          plati={plati[selected.id] ?? []}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

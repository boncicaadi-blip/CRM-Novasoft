"use client";

import { useMemo, useState, useTransition } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import {
  Wallet,
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Check,
  Pencil,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatEur } from "@/lib/format";
import { useTableSort } from "@/lib/useTableSort";
import { SortableTh } from "@/components/ui/SortableTh";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { MonthMultiSelect } from "@/components/ui/MonthMultiSelect";
import { CHELTUIELI_KPI_DEFINITIONS } from "@/lib/cheltuieli-kpi-definitions";
import { getTodayISO } from "@/lib/date";
import {
  createContractCheltuialaAction,
  updateContractCheltuialaAction,
  deleteContractCheltuialaAction,
  addCheltuialaLinieManualAction,
  updateCheltuialaLinieAction,
  deleteCheltuialaLinieAction,
  deleteCheltuieliLiniiAction,
  bulkMarkPlatitAction,
  syncCheltuieliLiniiAction,
} from "@/lib/actions/cheltuieli";
import type {
  ContractCheltuiala,
  CheltuialaLinie,
  StatusContractCheltuiala,
  TipCheltuiala,
  FrecventaCheltuiala,
} from "@/types/cheltuieli";
import type { Nomenclator } from "@/types/opportunity";

type ViewMode = "cheltuieli" | "contracte";
type PeriodFilter = "luna_curenta" | "ultimele_3_luni" | "anul_curent" | "toate" | "custom";

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "luna_curenta", label: "Luna curenta" },
  { value: "ultimele_3_luni", label: "Ultimele 3 luni" },
  { value: "anul_curent", label: "Anul curent" },
  { value: "toate", label: "Tot istoricul" },
  { value: "custom", label: "Perioada personalizata" },
];

function inPeriod(
  luna: string,
  period: PeriodFilter,
  customFrom: string,
  customTo: string,
  customMonths: string[] = []
): boolean {
  if (period === "toate") return true;
  const d = new Date(luna);
  const now = new Date();
  if (period === "custom") {
    if (customMonths.length > 0) return customMonths.includes(luna.slice(0, 7));
    if (customFrom && d < new Date(customFrom)) return false;
    if (customTo && d > new Date(customTo)) return false;
    return true;
  }
  if (period === "luna_curenta") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (period === "anul_curent") return d.getFullYear() === now.getFullYear();
  if (period === "ultimele_3_luni") {
    const threshold = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const sfarsitLunaCurenta = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return d >= threshold && d <= sfarsitLunaCurenta;
  }
  return true;
}

const selectClass =
  "w-full rounded-md border border-border-subtle bg-surface-2 px-2.5 py-2 text-sm text-text-primary outline-none focus:border-[#E8007A]";
const inputClass = selectClass;
const labelClass = "mb-1 block text-[11px] text-text-muted";

function NomOption({ n }: { n: Nomenclator }) {
  return (
    <option value={n.valoare} style={{ backgroundColor: "var(--surface-1)" }}>
      {n.valoare}
    </option>
  );
}

/**
 * Filtreaza optiunile de Clasa dupa Incadrarea selectata (relatia
 * parinte-copil din nomenclatoare). Clasele fara parinte setat inca
 * (neincadrate) raman mereu vizibile, indiferent de Incadrare, ca sa nu
 * dispara silentios pana Adi le asigneaza o incadrare din Setari ->
 * Nomenclatoare. `alwaysIncludeValoare` pastreaza vizibila si valoarea
 * curenta a unei linii existente, chiar daca nu (mai) se potriveste cu
 * Incadrarea aleasa - util la editare, ca sa nu "dispara" valoarea salvata.
 */
function clasaOptionsForIncadrare(
  clasaOptions: Nomenclator[],
  incadrareOptions: Nomenclator[],
  incadrareValoare: string,
  alwaysIncludeValoare?: string
): Nomenclator[] {
  const incadrareId = incadrareOptions.find((i) => i.valoare === incadrareValoare)?.id;
  if (!incadrareId) return clasaOptions;
  return clasaOptions.filter(
    (c) => !c.parent_id || c.parent_id === incadrareId || c.valoare === alwaysIncludeValoare
  );
}

interface LunaChartDatum {
  luna: string;
  label: string;
  prognozat: number;
  realizat: number;
}

function buildMonthlyChartData(linii: CheltuialaLinie[]): LunaChartDatum[] {
  const byMonth = new Map<string, { prognozat: number; realizat: number }>();
  for (const l of linii) {
    const key = l.luna.slice(0, 7);
    const cur = byMonth.get(key) ?? { prognozat: 0, realizat: 0 };
    cur.prognozat += l.valoare_prognozata;
    cur.realizat += l.valoare_realizata ?? 0;
    byMonth.set(key, cur);
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, v]) => ({
      luna: key,
      label: new Date(`${key}-01`).toLocaleDateString("ro-RO", { month: "short", year: "2-digit" }),
      prognozat: v.prognozat,
      realizat: v.realizat,
    }));
}

function CheltuieliChart({ linii }: { linii: CheltuialaLinie[] }) {
  const data = useMemo(() => buildMonthlyChartData(linii), [linii]);
  if (data.length === 0) return null;

  return (
    <div className="mb-5 rounded-xl border border-border-subtle bg-surface-1 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-text-primary">
        Prognozat vs. Realizat, pe perioada selectata
        <InfoTooltip title="Prognozat vs. Realizat" definition={CHELTUIELI_KPI_DEFINITIONS.evolutiePrognozatRealizat} />
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
          <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as LunaChartDatum;
              return (
                <ChartTooltipBox
                  title={d.label}
                  rows={[
                    { label: "Prognozat", value: `${d.prognozat.toLocaleString("ro-RO")} EUR`, color: "#475569" },
                    { label: "Realizat", value: `${d.realizat.toLocaleString("ro-RO")} EUR`, color: "#F97316" },
                  ]}
                />
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)" }} />
          <Bar dataKey="prognozat" name="Prognozat" fill="#475569" radius={[3, 3, 0, 0]} />
          <Bar dataKey="realizat" name="Realizat" fill="#F97316" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CheltuieliClient({
  contracte,
  cheltuieliLinii,
  incadrareOptions,
  clasaOptions,
}: {
  contracte: ContractCheltuiala[];
  cheltuieliLinii: CheltuialaLinie[];
  incadrareOptions: Nomenclator[];
  clasaOptions: Nomenclator[];
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("cheltuieli");
  const [period, setPeriod] = useState<PeriodFilter>("luna_curenta");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customMonths, setCustomMonths] = useState<string[]>([]);
  const [filterIncadrare, setFilterIncadrare] = useState("");
  const [filterClasa, setFilterClasa] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showContractForm, setShowContractForm] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingContract, setEditingContract] = useState<ContractCheltuiala | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const contractById = useMemo(() => new Map(contracte.map((c) => [c.id, c])), [contracte]);

  const filteredLinii = useMemo(
    () =>
      cheltuieliLinii.filter((l) => {
        const contract = l.contract_id ? contractById.get(l.contract_id) : undefined;
        return (
          inPeriod(l.luna, period, customFrom, customTo, customMonths) &&
          (!filterIncadrare || l.incadrare === filterIncadrare) &&
          (!filterClasa || l.clasa === filterClasa) &&
          (!filterStatus || contract?.status_contract === filterStatus)
        );
      }),
    [cheltuieliLinii, contractById, period, customFrom, customTo, customMonths, filterIncadrare, filterClasa, filterStatus]
  );

  const filteredContracte = useMemo(
    () =>
      contracte.filter(
        (c) =>
          (!filterIncadrare || c.incadrare === filterIncadrare) &&
          (!filterClasa || c.clasa === filterClasa) &&
          (!filterStatus || c.status_contract === filterStatus)
      ),
    [contracte, filterIncadrare, filterClasa, filterStatus]
  );

  const summary = useMemo(() => {
    const acum = new Date();
    const lunaCurentaKey = `${acum.getFullYear()}-${String(acum.getMonth() + 1).padStart(2, "0")}`;
    let prognozat = 0;
    let realizat = 0;
    let prognozatPanaAcum = 0;
    for (const l of filteredLinii) {
      prognozat += l.valoare_prognozata;
      realizat += l.valoare_realizata ?? 0;
      if (l.luna.slice(0, 7) <= lunaCurentaKey) prognozatPanaAcum += l.valoare_prognozata;
    }
    return { prognozat, realizat, prognozatPanaAcum, diferenta: realizat - prognozatPanaAcum };
  }, [filteredLinii]);

  function handleSync() {
    setSyncMessage(null);
    startTransition(async () => {
      const result = await syncCheltuieliLiniiAction();
      setSyncMessage(
        result.success ? `${result.data?.generate ?? 0} linii noi generate.` : (result.message ?? "Eroare.")
      );
    });
  }

  return (
    <div className="px-3 py-4 sm:px-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-heading text-text-primary">Cheltuieli</h1>
          <p className="text-sm text-text-muted">
            Contracte de cheltuiala (recurente si nerecurente), buget vs. realizat. EUR, fara TVA.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-md border border-border-subtle px-3 py-2 text-xs font-medium text-text-primary transition hover:bg-surface-1 disabled:opacity-50"
            >
              <RefreshCw size={13} />
              Genereaza linii lipsa
            </button>
            {viewMode === "cheltuieli" && (
              <button
                onClick={() => setShowManualForm(true)}
                className="flex items-center gap-1.5 rounded-md border border-border-subtle px-3 py-2 text-xs font-medium text-text-primary transition hover:bg-surface-1"
              >
                <Plus size={14} />
                Cheltuiala manuala
              </button>
            )}
            <button
              onClick={() => setShowContractForm(true)}
              className="flex items-center gap-1.5 rounded-md bg-[#E8007A] px-3 py-2 text-xs font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA]"
            >
              <Plus size={14} />
              Contract nou
            </button>
          </div>
          {syncMessage && <p className="text-xs text-text-muted">{syncMessage}</p>}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            Prognozat (buget)
            <InfoTooltip title="Prognozat" definition={CHELTUIELI_KPI_DEFINITIONS.prognozat} />
          </p>
          <p className="font-mono text-2xl font-medium text-text-primary">{formatEur(summary.prognozat)}</p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            Realizat
            <InfoTooltip title="Realizat" definition={CHELTUIELI_KPI_DEFINITIONS.realizat} />
          </p>
          <p className="font-mono text-2xl font-medium text-text-primary">{formatEur(summary.realizat)}</p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            Diferenta (pana in luna curenta)
            <InfoTooltip title="Diferenta (YTD)" definition={CHELTUIELI_KPI_DEFINITIONS.diferentaYtd} />
          </p>
          <p
            className={`font-mono text-2xl font-medium ${summary.diferenta <= 0 ? "text-green-400" : "text-red-400"}`}
          >
            {summary.diferenta >= 0 ? "+" : ""}
            {formatEur(summary.diferenta)}
          </p>
          <p className="mt-0.5 text-[10px] text-text-faint">Nu include lunile viitoare</p>
        </div>
      </div>

      <CheltuieliChart linii={filteredLinii} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-md border border-border-subtle p-0.5">
          <button
            onClick={() => setViewMode("cheltuieli")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${
              viewMode === "cheltuieli" ? "bg-surface-2 text-text-primary" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <Wallet size={13} />
            Cheltuieli
          </button>
          <button
            onClick={() => setViewMode("contracte")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${
              viewMode === "contracte" ? "bg-surface-2 text-text-primary" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <FileText size={13} />
            Contracte
          </button>
        </div>
        {viewMode === "cheltuieli" && (
          <>
            <select
              value={period}
              onChange={(e) => {
                const next = e.target.value as PeriodFilter;
                setPeriod(next);
                if (next === "custom" && (!customFrom || !customTo)) {
                  const now = new Date();
                  const start = new Date(now.getFullYear(), now.getMonth(), 1);
                  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                  setCustomFrom(start.toISOString().slice(0, 10));
                  setCustomTo(end.toISOString().slice(0, 10));
                }
              }}
              className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text-primary outline-none focus:border-[#E8007A]"
            >
              {PERIOD_OPTIONS.map((p) => (
                <option key={p.value} value={p.value} style={{ backgroundColor: "var(--surface-1)" }}>
                  {p.label}
                </option>
              ))}
            </select>
            {period === "custom" && (
              <>
                <MonthMultiSelect selected={customMonths} onChange={setCustomMonths} />
                <span className="text-[10px] text-text-faint">sau interval:</span>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-xs text-text-primary outline-none focus:border-[#E8007A]"
                />
                <span className="text-xs text-text-muted">-</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-xs text-text-primary outline-none focus:border-[#E8007A]"
                />
              </>
            )}
          </>
        )}
        <select
          value={filterIncadrare}
          onChange={(e) => setFilterIncadrare(e.target.value)}
          className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text-primary outline-none focus:border-[#E8007A]"
        >
          <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
            Toate incadrarile
          </option>
          {incadrareOptions.map((n) => (
            <NomOption key={n.id} n={n} />
          ))}
        </select>
        <select
          value={filterClasa}
          onChange={(e) => setFilterClasa(e.target.value)}
          className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text-primary outline-none focus:border-[#E8007A]"
        >
          <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
            Toate clasele
          </option>
          {clasaOptions.map((n) => (
            <NomOption key={n.id} n={n} />
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text-primary outline-none focus:border-[#E8007A]"
        >
          <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
            Toate statusurile
          </option>
          <option value="Activ" style={{ backgroundColor: "var(--surface-1)" }}>
            Activ
          </option>
          <option value="Inactiv" style={{ backgroundColor: "var(--surface-1)" }}>
            Inactiv
          </option>
        </select>
        {(filterIncadrare || filterClasa || filterStatus) && (
          <button
            onClick={() => {
              setFilterIncadrare("");
              setFilterClasa("");
              setFilterStatus("");
            }}
            className="text-xs text-[#E8007A] hover:text-[#FF4FAA]"
          >
            Sterge filtrele
          </button>
        )}
      </div>

      {viewMode === "cheltuieli" ? (
        <CheltuieliTable linii={filteredLinii} contracte={contracte} incadrareOptions={incadrareOptions} clasaOptions={clasaOptions} />
      ) : (
        <ContracteCheltuieliTable contracte={filteredContracte} onEdit={setEditingContract} />
      )}

      {showContractForm && (
        <ContractCheltuialaFormModal
          incadrareOptions={incadrareOptions}
          clasaOptions={clasaOptions}
          onClose={() => setShowContractForm(false)}
        />
      )}
      {editingContract && (
        <ContractCheltuialaFormModal
          contract={editingContract}
          incadrareOptions={incadrareOptions}
          clasaOptions={clasaOptions}
          onClose={() => setEditingContract(null)}
        />
      )}
      {showManualForm && (
        <ManualCheltuialaFormModal
          incadrareOptions={incadrareOptions}
          clasaOptions={clasaOptions}
          onClose={() => setShowManualForm(false)}
        />
      )}
    </div>
  );
}

function CheltuieliTable({
  linii,
  contracte,
  incadrareOptions,
  clasaOptions,
}: {
  linii: CheltuialaLinie[];
  contracte: ContractCheltuiala[];
  incadrareOptions: Nomenclator[];
  clasaOptions: Nomenclator[];
}) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [incadrare, setIncadrare] = useState("");
  const [clasa, setClasa] = useState("");
  const [luna, setLuna] = useState("");
  const [valoarePrognozata, setValoarePrognozata] = useState("");
  const [valoareRealizata, setValoareRealizata] = useState("");
  const [platit, setPlatit] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<number | "toate">(50);
  const [page, setPage] = useState(1);

  const contractById = useMemo(() => new Map(contracte.map((c) => [c.id, c])), [contracte]);

  function startEdit(l: CheltuialaLinie) {
    setEditingId(l.id);
    setIncadrare(l.incadrare);
    setClasa(l.clasa);
    setLuna(l.luna.slice(0, 7));
    setValoarePrognozata(String(l.valoare_prognozata));
    setValoareRealizata(l.valoare_realizata !== null ? String(l.valoare_realizata) : "");
    setPlatit(l.platit);
  }

  function handleSave(id: string) {
    startTransition(async () => {
      await updateCheltuialaLinieAction(id, {
        incadrare,
        clasa,
        luna: luna ? `${luna}-01` : undefined,
        valoare_prognozata: Number(valoarePrognozata),
        valoare_realizata: valoareRealizata === "" ? null : Number(valoareRealizata),
        platit,
      });
      setEditingId(null);
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Stergi aceasta cheltuiala?")) return;
    startTransition(async () => {
      await deleteCheltuialaLinieAction(id);
    });
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
    setCheckedIds((prev) => (prev.size === sorted.length ? new Set() : new Set(sorted.map((l) => l.id))));
  }

  function handleBulkDelete() {
    if (checkedIds.size === 0) return;
    const confirmation = prompt(
      `Scrie STERGE ca sa confirmi stergerea celor ${checkedIds.size} cheltuieli selectate. Actiunea nu poate fi anulata.`
    );
    if (confirmation !== "STERGE") return;
    startTransition(async () => {
      await deleteCheltuieliLiniiAction(Array.from(checkedIds));
      setCheckedIds(new Set());
    });
  }

  function handleBulkPlatit() {
    if (checkedIds.size === 0) return;
    if (
      !confirm(
        `Marchezi ${checkedIds.size} cheltuieli ca "Platit"? Valoarea prognozata devine automat valoare realizata, pentru fiecare.`
      )
    )
      return;
    startTransition(async () => {
      await bulkMarkPlatitAction(Array.from(checkedIds));
      setCheckedIds(new Set());
    });
  }

  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  const defaultOrdered = useMemo(() => [...linii].sort((a, b) => (a.luna < b.luna ? 1 : -1)), [linii]);
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(defaultOrdered, (l, key) => {
    const contract = l.contract_id ? contractById.get(l.contract_id) : undefined;
    switch (key) {
      case "incadrare":
        return l.incadrare;
      case "clasa":
        return l.clasa;
      case "status":
        return contract?.status_contract ?? "";
      case "luna":
        return l.luna;
      case "prognozat":
        return l.valoare_prognozata;
      case "realizat":
        return l.valoare_realizata ?? -Infinity;
      case "platit":
        return l.platit ? 1 : 0;
      default:
        return null;
    }
  });
  const totalPages = pageSize === "toate" ? 1 : Math.max(1, Math.ceil(sorted.length / pageSize));
  const pagedRows = useMemo(() => {
    if (pageSize === "toate") return sorted;
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  return (
    <div>
      {checkedIds.size > 0 && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-[#E8007A]/20 bg-[#E8007A]/5 px-3 py-2">
          <span className="text-xs text-text-primary">{checkedIds.size} selectate</span>
          <button
            onClick={handleBulkPlatit}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-md bg-green-500/15 px-2.5 py-1.5 text-xs font-medium text-green-400 transition hover:bg-green-500/25 disabled:opacity-50"
          >
            <CheckCheck size={13} />
            Marcheaza platit (= prognozat)
          </button>
          <button
            onClick={handleBulkDelete}
            disabled={isPending}
            className="ml-auto flex items-center gap-1.5 rounded-md bg-red-500/10 px-2.5 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
          >
            <Trash2 size={13} />
            Sterge selectate
          </button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-border-subtle">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-1 text-left text-[10px] uppercase text-text-muted">
              <th className="w-8 px-3 py-2">
                <input
                  type="checkbox"
                  checked={sorted.length > 0 && checkedIds.size === sorted.length}
                  onChange={toggleCheckAll}
                  className="h-3.5 w-3.5 rounded border-border-strong bg-surface-2"
                />
              </th>
              <SortableTh label="Incadrare" sortKey="incadrare" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} width={colWidths.incadrare} onResize={(w) => setColWidths((c) => ({ ...c, incadrare: w }))} />
              <SortableTh label="Clasa" sortKey="clasa" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} width={colWidths.clasa} onResize={(w) => setColWidths((c) => ({ ...c, clasa: w }))} />
              <SortableTh label="Contract" sortKey="status" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} width={colWidths.status} onResize={(w) => setColWidths((c) => ({ ...c, status: w }))} />
              <SortableTh label="Luna" sortKey="luna" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} width={colWidths.luna} onResize={(w) => setColWidths((c) => ({ ...c, luna: w }))} />
              <SortableTh label="Prognozat" sortKey="prognozat" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} align="right" width={colWidths.prognozat} onResize={(w) => setColWidths((c) => ({ ...c, prognozat: w }))} />
              <SortableTh label="Realizat" sortKey="realizat" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} align="right" width={colWidths.realizat} onResize={(w) => setColWidths((c) => ({ ...c, realizat: w }))} />
              <SortableTh label="Platit" sortKey="platit" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} align="center" width={colWidths.platit} onResize={(w) => setColWidths((c) => ({ ...c, platit: w }))} />
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((l) => {
              const isEditing = editingId === l.id;
              const contract = l.contract_id ? contractById.get(l.contract_id) : undefined;
              return (
                <tr key={l.id} className="border-b border-border-faint hover:bg-surface-1">
                  <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={checkedIds.has(l.id)}
                      onChange={() => toggleCheck(l.id)}
                      className="h-3.5 w-3.5 rounded border-border-strong bg-surface-2"
                    />
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {isEditing ? (
                      <select
                        value={incadrare}
                        onChange={(e) => {
                          const nou = e.target.value;
                          setIncadrare(nou);
                          const filtrate = clasaOptionsForIncadrare(clasaOptions, incadrareOptions, nou, clasa);
                          if (!filtrate.some((c) => c.valoare === clasa)) setClasa(filtrate[0]?.valoare ?? "");
                        }}
                        className={selectClass}
                      >
                        {incadrareOptions.map((n) => (
                          <NomOption key={n.id} n={n} />
                        ))}
                      </select>
                    ) : (
                      l.incadrare
                    )}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {isEditing ? (
                      <select value={clasa} onChange={(e) => setClasa(e.target.value)} className={selectClass}>
                        {clasaOptionsForIncadrare(clasaOptions, incadrareOptions, incadrare, l.clasa).map((n) => (
                          <NomOption key={n.id} n={n} />
                        ))}
                      </select>
                    ) : (
                      l.clasa
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {contract ? (
                      <span className={contract.status_contract === "Activ" ? "text-green-400" : "text-text-muted"}>
                        {contract.status_contract}
                      </span>
                    ) : (
                      <span className="text-text-faint">Manual</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {isEditing ? (
                      <input
                        type="month"
                        value={luna}
                        onChange={(e) => setLuna(e.target.value)}
                        className="rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-sm text-text-primary outline-none focus:border-[#E8007A]"
                      />
                    ) : (
                      new Date(l.luna).toLocaleDateString("ro-RO", { month: "short", year: "numeric" })
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={valoarePrognozata}
                        onChange={(e) => setValoarePrognozata(e.target.value)}
                        className="w-24 rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-right text-sm text-text-primary outline-none focus:border-[#E8007A]"
                      />
                    ) : (
                      <span className="font-mono text-text-primary">{formatEur(l.valoare_prognozata)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={valoareRealizata}
                        onChange={(e) => setValoareRealizata(e.target.value)}
                        className="w-24 rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-right text-sm text-text-primary outline-none focus:border-[#E8007A]"
                      />
                    ) : (
                      <span className="font-mono text-text-primary">
                        {l.valoare_realizata !== null ? formatEur(l.valoare_realizata) : "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={platit}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setPlatit(checked);
                          if (checked) setValoareRealizata(valoarePrognozata);
                        }}
                        className="h-3.5 w-3.5"
                      />
                    ) : l.platit ? (
                      <Check size={14} className="mx-auto text-green-400" />
                    ) : (
                      <span className="text-text-faint">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleSave(l.id)}
                          disabled={isPending}
                          className="rounded-md p-1 text-green-400 hover:bg-green-500/10"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded-md p-1 text-text-muted hover:bg-surface-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(l)}
                          className="rounded-md p-1 text-text-muted hover:bg-surface-1 hover:text-[#E8007A]"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => handleDelete(l.id)}
                          className="rounded-md p-1 text-text-faint hover:bg-red-500/10 hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-sm text-text-muted">
                  Nicio cheltuiala pentru filtrul curent.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
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
                  : "border border-border-subtle text-text-secondary hover:bg-surface-1"
              }`}
            >
              {size === "toate" ? "Toate" : size}
            </button>
          ))}
        </div>
        {pageSize !== "toate" && (
          <div className="flex items-center gap-2">
            <span>
              {sorted.length === 0
                ? "0 rezultate"
                : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, sorted.length)} din ${sorted.length}`}
            </span>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-border-subtle p-1 transition hover:bg-surface-1 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <span>
              Pagina {page} din {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-border-subtle p-1 transition hover:bg-surface-1 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ContracteCheltuieliTable({
  contracte,
  onEdit,
}: {
  contracte: ContractCheltuiala[];
  onEdit: (c: ContractCheltuiala) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [pageSize, setPageSize] = useState<number | "toate">(50);
  const [page, setPage] = useState(1);

  function handleDelete(id: string) {
    if (
      !confirm("Stergi acest contract? Liniile lui de cheltuiala se sterg si ele, automat. Actiunea nu poate fi anulata.")
    )
      return;
    startTransition(async () => {
      await deleteContractCheltuialaAction(id);
    });
  }

  const totalPages = pageSize === "toate" ? 1 : Math.max(1, Math.ceil(contracte.length / pageSize));
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(contracte, (c, key) => {
    switch (key) {
      case "incadrare":
        return c.incadrare;
      case "clasa":
        return c.clasa;
      case "tipFrecventa":
        return `${c.tip_cheltuiala} ${c.frecventa}`;
      case "valoare":
        return c.valoare_lunara;
      case "inceput":
        return c.data_inceput;
      case "sfarsit":
        return c.data_sfarsit ?? "";
      case "status":
        return c.status_contract;
      default:
        return null;
    }
  });
  const pagedRows = useMemo(() => {
    if (pageSize === "toate") return sorted;
    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, page, pageSize]);

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-border-subtle">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-1 text-left text-[10px] uppercase text-text-muted">
              <SortableTh label="Incadrare" sortKey="incadrare" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <SortableTh label="Clasa" sortKey="clasa" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <SortableTh label="Tip / Frecventa" sortKey="tipFrecventa" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <SortableTh label="Valoare" sortKey="valoare" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} align="right" />
              <SortableTh label="Inceput" sortKey="inceput" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <SortableTh label="Sfarsit" sortKey="sfarsit" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <SortableTh label="Status" sortKey="status" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.map((c) => (
              <tr
                key={c.id}
                onClick={() => onEdit(c)}
                className="cursor-pointer border-b border-border-faint hover:bg-surface-1"
              >
                <td className="px-3 py-2 text-text-secondary">{c.incadrare}</td>
                <td className="px-3 py-2 text-text-secondary">{c.clasa}</td>
                <td className="px-3 py-2 text-text-secondary">
                  {c.tip_cheltuiala} / {c.frecventa}
                  {c.frecventa === "Nerecurenta" && c.nr_rate > 1 && (
                    <span className="ml-1 text-[10px] text-text-muted">({c.nr_rate}x)</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-mono text-text-primary">{formatEur(c.valoare_lunara)}</td>
                <td className="px-3 py-2 text-text-secondary">{new Date(c.data_inceput).toLocaleDateString("ro-RO")}</td>
                <td className="px-3 py-2 text-text-secondary">
                  {c.data_sfarsit ? new Date(c.data_sfarsit).toLocaleDateString("ro-RO") : "Nedeterminat"}
                </td>
                <td className="px-3 py-2">
                  <span className={c.status_contract === "Activ" ? "text-green-400" : "text-text-muted"}>
                    {c.status_contract}
                  </span>
                </td>
                <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleDelete(c.id)}
                    disabled={isPending}
                    className="rounded-md p-1 text-text-faint hover:bg-red-500/10 hover:text-red-400"
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
            {contracte.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-text-muted">
                  Niciun contract de cheltuiala inca.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-text-muted">
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
                  : "border border-border-subtle text-text-secondary hover:bg-surface-1"
              }`}
            >
              {size === "toate" ? "Toate" : size}
            </button>
          ))}
        </div>
        {pageSize !== "toate" && (
          <div className="flex items-center gap-2">
            <span>
              {contracte.length === 0
                ? "0 rezultate"
                : `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, contracte.length)} din ${contracte.length}`}
            </span>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-border-subtle p-1 transition hover:bg-surface-1 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <span>
              Pagina {page} din {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-border-subtle p-1 transition hover:bg-surface-1 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

type DurationMode = "un_an" | "nedeterminat" | "personalizat";

function addMonthsToDateStr(dateStr: string, months: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function ContractCheltuialaFormModal({
  contract,
  incadrareOptions,
  clasaOptions,
  onClose,
}: {
  contract?: ContractCheltuiala;
  incadrareOptions: Nomenclator[];
  clasaOptions: Nomenclator[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [incadrare, setIncadrare] = useState(contract?.incadrare ?? incadrareOptions[0]?.valoare ?? "");
  const [clasa, setClasa] = useState(
    contract?.clasa ??
      clasaOptionsForIncadrare(clasaOptions, incadrareOptions, incadrareOptions[0]?.valoare ?? "")[0]?.valoare ??
      ""
  );
  const [detaliu, setDetaliu] = useState(contract?.detaliu ?? "");
  const [tipCheltuiala, setTipCheltuiala] = useState<TipCheltuiala>(contract?.tip_cheltuiala ?? "Fixe");
  const [frecventa, setFrecventa] = useState<FrecventaCheltuiala>(contract?.frecventa ?? "Recurenta");
  const [investitie, setInvestitie] = useState(contract?.investitie ?? false);
  const [repartizare, setRepartizare] = useState(contract?.repartizare ?? false);
  const [valoare, setValoare] = useState(String(contract?.valoare_lunara ?? ""));
  const [nrRate, setNrRate] = useState(String(contract?.nr_rate ?? 1));
  const [dataInceput, setDataInceput] = useState(contract?.data_inceput ?? getTodayISO());
  const [durationMode, setDurationMode] = useState<DurationMode>(
    contract ? (contract.data_sfarsit ? "personalizat" : "nedeterminat") : "un_an"
  );
  const [dataSfarsitCustom, setDataSfarsitCustom] = useState(contract?.data_sfarsit ?? "");
  const [statusContract, setStatusContract] = useState<StatusContractCheltuiala>(
    contract?.status_contract ?? "Activ"
  );
  const [observatii, setObservatii] = useState(contract?.observatii ?? "");
  const [message, setMessage] = useState<string | null>(null);

  function handleSave() {
    setMessage(null);
    if (!incadrare || !clasa) {
      setMessage("Incadrarea si clasa sunt obligatorii.");
      return;
    }
    if (!valoare || Number(valoare) <= 0) {
      setMessage("Valoarea trebuie sa fie pozitiva.");
      return;
    }

    const dataSfarsit =
      durationMode === "un_an"
        ? addMonthsToDateStr(dataInceput, 12)
        : durationMode === "nedeterminat"
          ? null
          : dataSfarsitCustom || null;

    startTransition(async () => {
      const fields = {
        incadrare,
        clasa,
        detaliu: detaliu || null,
        tip_cheltuiala: tipCheltuiala,
        frecventa,
        investitie,
        repartizare,
        valoare_lunara: Number(valoare),
        nr_rate: frecventa === "Nerecurenta" ? Math.max(1, Number(nrRate) || 1) : 1,
        data_inceput: dataInceput,
        data_sfarsit: dataSfarsit,
        observatii: observatii || null,
      };

      const result = contract
        ? await updateContractCheltuialaAction(contract.id, { ...fields, status_contract: statusContract })
        : await createContractCheltuialaAction(fields);

      if (result.success) onClose();
      else setMessage(result.message ?? "Eroare la salvare.");
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border-subtle bg-surface-1 p-5"
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-heading text-text-primary">
            {contract ? "Editeaza contract cheltuiala" : "Contract cheltuiala nou"}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        {contract && (
          <p className="mb-3 rounded-md border border-[#E8007A]/20 bg-[#E8007A]/5 px-3 py-2 text-[11px] text-text-primary">
            La salvare, toate liniile acestui contract se regenereaza dupa noile setari. Realizatul
            deja inregistrat se pastreaza, acolo unde perioadele se suprapun.
          </p>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Incadrare *</label>
              <select
                value={incadrare}
                onChange={(e) => {
                  const nou = e.target.value;
                  setIncadrare(nou);
                  const filtrate = clasaOptionsForIncadrare(clasaOptions, incadrareOptions, nou);
                  if (!filtrate.some((c) => c.valoare === clasa)) setClasa(filtrate[0]?.valoare ?? "");
                }}
                className={selectClass}
              >
                {incadrareOptions.map((n) => (
                  <NomOption key={n.id} n={n} />
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Clasa *</label>
              <select value={clasa} onChange={(e) => setClasa(e.target.value)} className={selectClass}>
                {clasaOptionsForIncadrare(clasaOptions, incadrareOptions, incadrare).map((n) => (
                  <NomOption key={n.id} n={n} />
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Detaliu</label>
            <input value={detaliu} onChange={(e) => setDetaliu(e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Tip cheltuiala</label>
              <select
                value={tipCheltuiala}
                onChange={(e) => setTipCheltuiala(e.target.value as TipCheltuiala)}
                className={selectClass}
              >
                <option value="Fixe" style={{ backgroundColor: "var(--surface-1)" }}>
                  Fixe
                </option>
                <option value="Variabile" style={{ backgroundColor: "var(--surface-1)" }}>
                  Variabile
                </option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Frecventa</label>
              <select
                value={frecventa}
                onChange={(e) => setFrecventa(e.target.value as FrecventaCheltuiala)}
                className={selectClass}
              >
                <option value="Recurenta" style={{ backgroundColor: "var(--surface-1)" }}>
                  Recurenta
                </option>
                <option value="Nerecurenta" style={{ backgroundColor: "var(--surface-1)" }}>
                  Nerecurenta
                </option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={investitie}
                onChange={(e) => setInvestitie(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Investitie
            </label>
            <label className="flex items-center gap-1.5 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={repartizare}
                onChange={(e) => setRepartizare(e.target.checked)}
                className="h-3.5 w-3.5"
              />
              Repartizare
            </label>
          </div>

          <div>
            <label className={labelClass}>
              {frecventa === "Recurenta" ? "Valoare lunara (EUR, fara TVA)" : "Valoare (EUR, fara TVA)"}
            </label>
            <input
              type="number"
              step="0.01"
              value={valoare}
              onChange={(e) => setValoare(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Data inceput</label>
            <input
              type="date"
              value={dataInceput}
              onChange={(e) => setDataInceput(e.target.value)}
              className={inputClass}
            />
          </div>

          {frecventa === "Recurenta" ? (
            <div>
              <label className={labelClass}>Durata</label>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: "un_an", label: "1 an (12 luni)" },
                    { value: "nedeterminat", label: "Nedeterminat" },
                    { value: "personalizat", label: "Data personalizata" },
                  ] as { value: DurationMode; label: string }[]
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDurationMode(opt.value)}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                      durationMode === opt.value
                        ? "bg-[#E8007A] text-[#0B0D1A]"
                        : "border border-border-subtle text-text-secondary hover:bg-surface-1"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {durationMode === "personalizat" && (
                <input
                  type="date"
                  value={dataSfarsitCustom}
                  onChange={(e) => setDataSfarsitCustom(e.target.value)}
                  className={`${inputClass} mt-2`}
                />
              )}
              {durationMode === "un_an" && (
                <p className="mt-1 text-[11px] text-text-muted">
                  Se genereaza automat pana la {addMonthsToDateStr(dataInceput, 12)}.
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className={labelClass}>Numar rate</label>
              <input
                type="number"
                min="1"
                step="1"
                value={nrRate}
                onChange={(e) => setNrRate(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-[11px] text-text-muted">
                Se genereaza {nrRate || 1} {Number(nrRate) > 1 ? "linii lunare" : "linie"}, cu valoarea
                impartita egal ({formatEur(Number(valoare || 0) / Math.max(1, Number(nrRate) || 1))} fiecare).
              </p>
            </div>
          )}

          {contract && (
            <div>
              <label className={labelClass}>Status contract</label>
              <select
                value={statusContract}
                onChange={(e) => setStatusContract(e.target.value as StatusContractCheltuiala)}
                className={selectClass}
              >
                <option value="Activ" style={{ backgroundColor: "var(--surface-1)" }}>
                  Activ
                </option>
                <option value="Inactiv" style={{ backgroundColor: "var(--surface-1)" }}>
                  Inactiv
                </option>
              </select>
            </div>
          )}

          <div>
            <label className={labelClass}>Observatii</label>
            <textarea
              value={observatii}
              onChange={(e) => setObservatii(e.target.value)}
              rows={2}
              className={inputClass}
            />
          </div>
        </div>

        {message && <p className="mt-3 text-xs text-red-400">{message}</p>}

        <button
          onClick={handleSave}
          disabled={isPending}
          className="mt-4 w-full rounded-md bg-[#E8007A] py-2 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
        >
          {isPending ? "Se salveaza..." : "Salveaza"}
        </button>
      </div>
    </div>
  );
}

function ManualCheltuialaFormModal({
  incadrareOptions,
  clasaOptions,
  onClose,
}: {
  incadrareOptions: Nomenclator[];
  clasaOptions: Nomenclator[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [incadrare, setIncadrare] = useState(incadrareOptions[0]?.valoare ?? "");
  const [clasa, setClasa] = useState(
    clasaOptionsForIncadrare(clasaOptions, incadrareOptions, incadrareOptions[0]?.valoare ?? "")[0]?.valoare ?? ""
  );
  const [detaliu, setDetaliu] = useState("");
  const [frecventa, setFrecventa] = useState<FrecventaCheltuiala>("Nerecurenta");
  const [valoarePrognozata, setValoarePrognozata] = useState("");
  const [luna, setLuna] = useState(getTodayISO().slice(0, 7));
  const [observatii, setObservatii] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function handleSave() {
    setMessage(null);
    if (!incadrare || !clasa) {
      setMessage("Incadrarea si clasa sunt obligatorii.");
      return;
    }
    startTransition(async () => {
      const result = await addCheltuialaLinieManualAction({
        incadrare,
        clasa,
        detaliu: detaliu || null,
        frecventa,
        valoare_prognozata: Number(valoarePrognozata),
        luna: `${luna}-01`,
        observatii: observatii || null,
      });
      if (result.success) onClose();
      else setMessage(result.message ?? "Eroare la salvare.");
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-border-subtle bg-surface-1 p-5"
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-heading text-text-primary">Cheltuiala manuala</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Incadrare *</label>
              <select
                value={incadrare}
                onChange={(e) => {
                  const nou = e.target.value;
                  setIncadrare(nou);
                  const filtrate = clasaOptionsForIncadrare(clasaOptions, incadrareOptions, nou);
                  if (!filtrate.some((c) => c.valoare === clasa)) setClasa(filtrate[0]?.valoare ?? "");
                }}
                className={selectClass}
              >
                {incadrareOptions.map((n) => (
                  <NomOption key={n.id} n={n} />
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Clasa *</label>
              <select value={clasa} onChange={(e) => setClasa(e.target.value)} className={selectClass}>
                {clasaOptionsForIncadrare(clasaOptions, incadrareOptions, incadrare).map((n) => (
                  <NomOption key={n.id} n={n} />
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Detaliu</label>
            <input value={detaliu} onChange={(e) => setDetaliu(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Frecventa</label>
            <select
              value={frecventa}
              onChange={(e) => setFrecventa(e.target.value as FrecventaCheltuiala)}
              className={selectClass}
            >
              <option value="Recurenta" style={{ backgroundColor: "var(--surface-1)" }}>
                Recurenta
              </option>
              <option value="Nerecurenta" style={{ backgroundColor: "var(--surface-1)" }}>
                Nerecurenta
              </option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Valoare (EUR, fara TVA)</label>
              <input
                type="number"
                step="0.01"
                value={valoarePrognozata}
                onChange={(e) => setValoarePrognozata(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Luna</label>
              <input type="month" value={luna} onChange={(e) => setLuna(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Observatii</label>
            <textarea
              value={observatii}
              onChange={(e) => setObservatii(e.target.value)}
              rows={2}
              className={inputClass}
            />
          </div>
        </div>

        {message && <p className="mt-3 text-xs text-red-400">{message}</p>}

        <button
          onClick={handleSave}
          disabled={isPending}
          className="mt-4 w-full rounded-md bg-[#E8007A] py-2 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
        >
          {isPending ? "Se salveaza..." : "Salveaza"}
        </button>
      </div>
    </div>
  );
}

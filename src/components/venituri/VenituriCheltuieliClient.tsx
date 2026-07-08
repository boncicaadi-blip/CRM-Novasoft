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
  TrendingUp,
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
import { VENITURI_KPI_DEFINITIONS } from "@/lib/venituri-kpi-definitions";
import { getTodayISO } from "@/lib/date";
import {
  createContractAction,
  updateContractAction,
  deleteContractAction,
  addVenitLinieManualAction,
  updateVenitLinieAction,
  deleteVenitLinieAction,
  deleteVenituriLiniiAction,
  bulkMarkFacturatAction,
  syncVenituriLiniiAction,
} from "@/lib/actions/venituri";
import type { Contract, VenitLinie, ContractStatus, TipVenit } from "@/types/venituri";
import type { ClientOption } from "@/lib/data/venituri";
import type { Nomenclator } from "@/types/opportunity";

type ViewMode = "venituri" | "contracte";
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

interface LunaChartDatum {
  luna: string;
  label: string;
  estimat: number;
  realizat: number;
}

function buildMonthlyChartData(linii: VenitLinie[]): LunaChartDatum[] {
  const byMonth = new Map<string, { estimat: number; realizat: number }>();
  for (const l of linii) {
    const key = l.luna.slice(0, 7);
    const cur = byMonth.get(key) ?? { estimat: 0, realizat: 0 };
    cur.estimat += l.venit_estimat;
    cur.realizat += l.venit_realizat ?? 0;
    byMonth.set(key, cur);
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, v]) => ({
      luna: key,
      label: new Date(`${key}-01`).toLocaleDateString("ro-RO", { month: "short", year: "2-digit" }),
      estimat: v.estimat,
      realizat: v.realizat,
    }));
}

function VeniturChart({ linii }: { linii: VenitLinie[] }) {
  const data = useMemo(() => buildMonthlyChartData(linii), [linii]);

  if (data.length === 0) return null;

  return (
    <div className="mb-5 rounded-xl border border-border-subtle bg-surface-1 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-text-primary">
        Estimat vs. Realizat, pe perioada selectata
        <InfoTooltip title="Estimat vs. Realizat" definition={VENITURI_KPI_DEFINITIONS.evolutieEstimatRealizat} />
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
                    { label: "Estimat", value: `${d.estimat.toLocaleString("ro-RO")} EUR`, color: "#475569" },
                    { label: "Realizat", value: `${d.realizat.toLocaleString("ro-RO")} EUR`, color: "#22C55E" },
                  ]}
                />
              );
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)" }} />
          <Bar dataKey="estimat" name="Estimat" fill="#475569" radius={[3, 3, 0, 0]} />
          <Bar dataKey="realizat" name="Realizat" fill="#22C55E" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function VenituriCheltuieliClient({
  contracte,
  venituriLinii,
  clienti,
  produseOptions,
  serviciiOptions,
  modalitatiOptions,
  stadiiOptions,
}: {
  contracte: Contract[];
  venituriLinii: VenitLinie[];
  clienti: ClientOption[];
  produseOptions: Nomenclator[];
  serviciiOptions: Nomenclator[];
  modalitatiOptions: Nomenclator[];
  stadiiOptions: Nomenclator[];
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("venituri");
  const [period, setPeriod] = useState<PeriodFilter>("luna_curenta");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customMonths, setCustomMonths] = useState<string[]>([]);
  const [filterClient, setFilterClient] = useState("");
  const [filterProdus, setFilterProdus] = useState("");
  const [filterServiciu, setFilterServiciu] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterTipVenit, setFilterTipVenit] = useState("");
  const [filterStadiu, setFilterStadiu] = useState("");
  const [isPending, startTransition] = useTransition();
  const [showContractForm, setShowContractForm] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const contractById = useMemo(() => new Map(contracte.map((c) => [c.id, c])), [contracte]);

  const clientOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of venituriLinii) set.add(l.nume_client);
    for (const c of contracte) set.add(c.nume_client);
    return Array.from(set).sort();
  }, [venituriLinii, contracte]);

  const filteredLinii = useMemo(
    () =>
      venituriLinii.filter((l) => {
        const contract = l.contract_id ? contractById.get(l.contract_id) : undefined;
        return (
          inPeriod(l.luna, period, customFrom, customTo, customMonths) &&
          (!filterClient || l.nume_client === filterClient) &&
          (!filterProdus || l.produs === filterProdus) &&
          (!filterServiciu || l.serviciu === filterServiciu) &&
          (!filterStatus || contract?.status_contract === filterStatus) &&
          (!filterTipVenit || l.tip_venit === filterTipVenit) &&
          (!filterStadiu || contract?.stadiu_contract === filterStadiu)
        );
      }),
    [
      venituriLinii,
      contractById,
      period,
      customFrom,
      customTo,
      customMonths,
      filterClient,
      filterProdus,
      filterServiciu,
      filterStatus,
      filterTipVenit,
      filterStadiu,
    ]
  );

  const filteredContracte = useMemo(
    () =>
      contracte.filter(
        (c) =>
          (!filterClient || c.nume_client === filterClient) &&
          (!filterProdus || c.produs === filterProdus) &&
          (!filterServiciu || c.serviciu === filterServiciu) &&
          (!filterStatus || c.status_contract === filterStatus) &&
          (!filterTipVenit || c.tip_venit === filterTipVenit) &&
          (!filterStadiu || c.stadiu_contract === filterStadiu)
      ),
    [contracte, filterClient, filterProdus, filterServiciu, filterStatus, filterTipVenit, filterStadiu]
  );

  const summary = useMemo(() => {
    const acum = new Date();
    const lunaCurentaKey = `${acum.getFullYear()}-${String(acum.getMonth() + 1).padStart(2, "0")}`;
    let estimat = 0;
    let realizat = 0;
    let estimatPanaAcum = 0;
    for (const l of filteredLinii) {
      estimat += l.venit_estimat;
      realizat += l.venit_realizat ?? 0;
      if (l.luna.slice(0, 7) <= lunaCurentaKey) estimatPanaAcum += l.venit_estimat;
    }
    return { estimat, realizat, estimatPanaAcum, diferenta: realizat - estimatPanaAcum };
  }, [filteredLinii]);

  function handleSync() {
    setSyncMessage(null);
    startTransition(async () => {
      const result = await syncVenituriLiniiAction();
      setSyncMessage(
        result.success
          ? `${result.data?.generate ?? 0} linii noi generate.`
          : (result.message ?? "Eroare.")
      );
    });
  }

  return (
    <div className="px-3 py-4 sm:px-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-heading text-text-primary">Venituri & Cheltuieli</h1>
          <p className="text-sm text-text-muted">
            Contracte (recurente si nerecurente), buget vs. realizat. Toate valorile in EUR, fara TVA.
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
            {viewMode === "venituri" && (
              <button
                onClick={() => setShowManualForm(true)}
                className="flex items-center gap-1.5 rounded-md border border-border-subtle px-3 py-2 text-xs font-medium text-text-primary transition hover:bg-surface-1"
              >
                <Plus size={14} />
                Venit manual
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
            Venit estimat (buget)
            <InfoTooltip title="Venit estimat" definition={VENITURI_KPI_DEFINITIONS.venitEstimat} />
          </p>
          <p className="font-mono text-2xl font-medium text-text-primary">{formatEur(summary.estimat)}</p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            Venit realizat
            <InfoTooltip title="Venit realizat" definition={VENITURI_KPI_DEFINITIONS.venitRealizat} />
          </p>
          <p className="font-mono text-2xl font-medium text-text-primary">{formatEur(summary.realizat)}</p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            Diferenta (pana in luna curenta)
            <InfoTooltip title="Diferenta (YTD)" definition={VENITURI_KPI_DEFINITIONS.diferentaYtd} />
          </p>
          <p
            className={`font-mono text-2xl font-medium ${summary.diferenta >= 0 ? "text-green-400" : "text-red-400"}`}
          >
            {summary.diferenta >= 0 ? "+" : ""}
            {formatEur(summary.diferenta)}
          </p>
          <p className="mt-0.5 text-[10px] text-text-faint">Nu include lunile viitoare</p>
        </div>
      </div>

      <VeniturChart linii={filteredLinii} />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-md border border-border-subtle p-0.5">
          <button
            onClick={() => setViewMode("venituri")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${
              viewMode === "venituri" ? "bg-surface-2 text-text-primary" : "text-text-muted hover:text-text-primary"
            }`}
          >
            <TrendingUp size={13} />
            Venituri
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
        {viewMode === "venituri" && (
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
            <select
              value={filterTipVenit}
              onChange={(e) => setFilterTipVenit(e.target.value)}
              className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text-primary outline-none focus:border-[#E8007A]"
            >
              <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                Recurent + Nerecurent
              </option>
              <option value="Recurent" style={{ backgroundColor: "var(--surface-1)" }}>
                Recurent
              </option>
              <option value="Nerecurent" style={{ backgroundColor: "var(--surface-1)" }}>
                Nerecurent
              </option>
            </select>
          </>
        )}
        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text-primary outline-none focus:border-[#E8007A]"
        >
          <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
            Toti clientii
          </option>
          {clientOptions.map((c) => (
            <option key={c} value={c} style={{ backgroundColor: "var(--surface-1)" }}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={filterProdus}
          onChange={(e) => setFilterProdus(e.target.value)}
          className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text-primary outline-none focus:border-[#E8007A]"
        >
          <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
            Toate produsele
          </option>
          {produseOptions.map((n) => (
            <NomOption key={n.id} n={n} />
          ))}
        </select>
        <select
          value={filterServiciu}
          onChange={(e) => setFilterServiciu(e.target.value)}
          className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text-primary outline-none focus:border-[#E8007A]"
        >
          <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
            Toate serviciile
          </option>
          {serviciiOptions.map((n) => (
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
        <select
          value={filterStadiu}
          onChange={(e) => setFilterStadiu(e.target.value)}
          className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-text-primary outline-none focus:border-[#E8007A]"
        >
          <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
            Toate stadiile
          </option>
          {stadiiOptions.map((n) => (
            <NomOption key={n.id} n={n} />
          ))}
        </select>
        {(filterClient || filterProdus || filterServiciu || filterStatus || filterStadiu) && (
          <button
            onClick={() => {
              setFilterClient("");
              setFilterProdus("");
              setFilterServiciu("");
              setFilterStatus("");
              setFilterStadiu("");
            }}
            className="text-xs text-[#E8007A] hover:text-[#FF4FAA]"
          >
            Sterge filtrele
          </button>
        )}
      </div>

      {viewMode === "venituri" ? (
        <VenituriTable
          linii={filteredLinii}
          contracte={contracte}
          produseOptions={produseOptions}
          serviciiOptions={serviciiOptions}
        />
      ) : (
        <ContracteTable contracte={filteredContracte} onEdit={setEditingContract} />
      )}

      {showContractForm && (
        <ContractFormModal
          clienti={clienti}
          produseOptions={produseOptions}
          serviciiOptions={serviciiOptions}
          modalitatiOptions={modalitatiOptions}
          stadiiOptions={stadiiOptions}
          onClose={() => setShowContractForm(false)}
        />
      )}
      {editingContract && (
        <ContractFormModal
          contract={editingContract}
          clienti={clienti}
          produseOptions={produseOptions}
          serviciiOptions={serviciiOptions}
          modalitatiOptions={modalitatiOptions}
          stadiiOptions={stadiiOptions}
          onClose={() => setEditingContract(null)}
        />
      )}
      {showManualForm && (
        <ManualVenitFormModal
          clienti={clienti}
          produseOptions={produseOptions}
          serviciiOptions={serviciiOptions}
          onClose={() => setShowManualForm(false)}
        />
      )}
    </div>
  );
}

function VenituriTable({
  linii,
  contracte,
  produseOptions,
  serviciiOptions,
}: {
  linii: VenitLinie[];
  contracte: Contract[];
  produseOptions: Nomenclator[];
  serviciiOptions: Nomenclator[];
}) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [produs, setProdus] = useState("");
  const [serviciu, setServiciu] = useState("");
  const [luna, setLuna] = useState("");
  const [venitEstimat, setVenitEstimat] = useState("");
  const [venitRealizat, setVenitRealizat] = useState("");
  const [facturat, setFacturat] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<number | "toate">(50);
  const [page, setPage] = useState(1);

  const contractById = useMemo(() => new Map(contracte.map((c) => [c.id, c])), [contracte]);

  function startEdit(l: VenitLinie) {
    setEditingId(l.id);
    setProdus(l.produs ?? "");
    setServiciu(l.serviciu ?? "");
    setLuna(l.luna.slice(0, 7));
    setVenitEstimat(String(l.venit_estimat));
    setVenitRealizat(l.venit_realizat !== null ? String(l.venit_realizat) : "");
    setFacturat(l.facturat);
  }

  function handleSave(id: string) {
    startTransition(async () => {
      await updateVenitLinieAction(id, {
        produs: produs || null,
        serviciu: serviciu || null,
        luna: luna ? `${luna}-01` : undefined,
        venit_estimat: Number(venitEstimat),
        venit_realizat: venitRealizat === "" ? null : Number(venitRealizat),
        facturat,
      });
      setEditingId(null);
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Stergi aceasta linie de venit?")) return;
    startTransition(async () => {
      await deleteVenitLinieAction(id);
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
      `Scrie STERGE ca sa confirmi stergerea celor ${checkedIds.size} linii selectate. Actiunea nu poate fi anulata.`
    );
    if (confirmation !== "STERGE") return;
    startTransition(async () => {
      await deleteVenituriLiniiAction(Array.from(checkedIds));
      setCheckedIds(new Set());
    });
  }

  function handleBulkFacturat() {
    if (checkedIds.size === 0) return;
    if (
      !confirm(
        `Marchezi ${checkedIds.size} linii ca "Facturat"? Valoarea estimata devine automat valoare realizata, pentru fiecare.`
      )
    )
      return;
    startTransition(async () => {
      await bulkMarkFacturatAction(Array.from(checkedIds));
      setCheckedIds(new Set());
    });
  }

  const [colWidths, setColWidths] = useState<Record<string, number>>({});

  const defaultOrdered = useMemo(() => [...linii].sort((a, b) => (a.luna < b.luna ? 1 : -1)), [linii]);
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(defaultOrdered, (l, key) => {
    const contract = l.contract_id ? contractById.get(l.contract_id) : undefined;
    switch (key) {
      case "client":
        return l.nume_client;
      case "tip":
        return l.tip_venit;
      case "produs":
        return l.produs ?? "";
      case "serviciu":
        return l.serviciu ?? "";
      case "status":
        return contract?.status_contract ?? "";
      case "modalitate":
        return contract?.modalitate_facturare ?? "";
      case "luna":
        return l.luna;
      case "estimat":
        return l.venit_estimat;
      case "realizat":
        return l.venit_realizat ?? -Infinity;
      case "facturat":
        return l.facturat ? 1 : 0;
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
            onClick={handleBulkFacturat}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-md bg-green-500/15 px-2.5 py-1.5 text-xs font-medium text-green-400 transition hover:bg-green-500/25 disabled:opacity-50"
          >
            <CheckCheck size={13} />
            Marcheaza facturat (= estimat)
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
              <SortableTh label="Client" sortKey="client" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} width={colWidths.client} onResize={(w) => setColWidths((c) => ({ ...c, client: w }))} />
              <SortableTh label="Tip" sortKey="tip" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} width={colWidths.tip} onResize={(w) => setColWidths((c) => ({ ...c, tip: w }))} />
              <SortableTh label="Produs" sortKey="produs" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} width={colWidths.produs} onResize={(w) => setColWidths((c) => ({ ...c, produs: w }))} />
              <SortableTh label="Serviciu" sortKey="serviciu" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} width={colWidths.serviciu} onResize={(w) => setColWidths((c) => ({ ...c, serviciu: w }))} />
              <SortableTh label="Contract" sortKey="status" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} width={colWidths.status} onResize={(w) => setColWidths((c) => ({ ...c, status: w }))} />
              <SortableTh label="Modalitate" sortKey="modalitate" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} width={colWidths.modalitate} onResize={(w) => setColWidths((c) => ({ ...c, modalitate: w }))} />
              <SortableTh label="Luna" sortKey="luna" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} width={colWidths.luna} onResize={(w) => setColWidths((c) => ({ ...c, luna: w }))} />
              <SortableTh label="Estimat" sortKey="estimat" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} align="right" width={colWidths.estimat} onResize={(w) => setColWidths((c) => ({ ...c, estimat: w }))} />
              <SortableTh label="Realizat" sortKey="realizat" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} align="right" width={colWidths.realizat} onResize={(w) => setColWidths((c) => ({ ...c, realizat: w }))} />
              <SortableTh label="Facturat" sortKey="facturat" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} align="center" width={colWidths.facturat} onResize={(w) => setColWidths((c) => ({ ...c, facturat: w }))} />
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
                  <td className="px-3 py-2 text-text-primary">{l.nume_client}</td>
                  <td className="px-3 py-2 text-text-secondary">{l.tip_venit}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {isEditing ? (
                      <select value={produs} onChange={(e) => setProdus(e.target.value)} className={selectClass}>
                        <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                          —
                        </option>
                        {produseOptions.map((n) => (
                          <NomOption key={n.id} n={n} />
                        ))}
                      </select>
                    ) : (
                      (l.produs ?? "—")
                    )}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {isEditing ? (
                      <select value={serviciu} onChange={(e) => setServiciu(e.target.value)} className={selectClass}>
                        <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                          —
                        </option>
                        {serviciiOptions.map((n) => (
                          <NomOption key={n.id} n={n} />
                        ))}
                      </select>
                    ) : (
                      (l.serviciu ?? "—")
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
                  <td className="px-3 py-2 text-text-secondary">{contract?.modalitate_facturare ?? "—"}</td>
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
                        value={venitEstimat}
                        onChange={(e) => setVenitEstimat(e.target.value)}
                        className="w-24 rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-right text-sm text-text-primary outline-none focus:border-[#E8007A]"
                      />
                    ) : (
                      <span className="font-mono text-text-primary">{formatEur(l.venit_estimat)}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={venitRealizat}
                        onChange={(e) => setVenitRealizat(e.target.value)}
                        className="w-24 rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-right text-sm text-text-primary outline-none focus:border-[#E8007A]"
                      />
                    ) : (
                      <span className="font-mono text-text-primary">
                        {l.venit_realizat !== null ? formatEur(l.venit_realizat) : "—"}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        checked={facturat}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFacturat(checked);
                          if (checked) setVenitRealizat(venitEstimat);
                        }}
                        className="h-3.5 w-3.5"
                      />
                    ) : l.facturat ? (
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
                <td colSpan={12} className="px-3 py-8 text-center text-sm text-text-muted">
                  Nicio linie de venit pentru filtrul curent.
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

function ContracteTable({
  contracte,
  onEdit,
}: {
  contracte: Contract[];
  onEdit: (c: Contract) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [pageSize, setPageSize] = useState<number | "toate">(50);
  const [page, setPage] = useState(1);

  function handleDelete(id: string) {
    if (!confirm("Stergi acest contract? Liniile lui de venit se sterg si ele, automat. Actiunea nu poate fi anulata."))
      return;
    startTransition(async () => {
      await deleteContractAction(id);
    });
  }

  const totalPages = pageSize === "toate" ? 1 : Math.max(1, Math.ceil(contracte.length / pageSize));
  const { sorted, sortKey, sortDir, requestSort } = useTableSort(contracte, (c, key) => {
    switch (key) {
      case "client":
        return c.nume_client;
      case "tip":
        return c.tip_venit;
      case "produs":
        return c.produs ?? "";
      case "serviciu":
        return c.serviciu ?? "";
      case "modalitate":
        return c.modalitate_facturare ?? "";
      case "valoare":
        return c.valoare_lunara;
      case "inceput":
        return c.data_inceput;
      case "sfarsit":
        return c.data_sfarsit ?? "";
      case "stadiu":
        return c.stadiu_contract ?? "";
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
            <SortableTh label="Client" sortKey="client" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
            <SortableTh label="Tip venit" sortKey="tip" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
            <SortableTh label="Produs" sortKey="produs" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
            <SortableTh label="Serviciu" sortKey="serviciu" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
            <SortableTh label="Modalitate" sortKey="modalitate" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
            <SortableTh label="Valoare" sortKey="valoare" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} align="right" />
            <SortableTh label="Inceput" sortKey="inceput" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
            <SortableTh label="Sfarsit" sortKey="sfarsit" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
            <SortableTh label="Stadiu" sortKey="stadiu" currentSortKey={sortKey} sortDir={sortDir} onSort={requestSort} />
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
              <td className="px-3 py-2 text-text-primary">{c.nume_client}</td>
              <td className="px-3 py-2 text-text-secondary">{c.tip_venit}</td>
              <td className="px-3 py-2 text-text-secondary">{c.produs ?? "—"}</td>
              <td className="px-3 py-2 text-text-secondary">{c.serviciu ?? "—"}</td>
              <td className="px-3 py-2 text-text-secondary">
                {c.modalitate_facturare ?? "—"}
                {c.tip_venit === "Nerecurent" && c.nr_rate > 1 && (
                  <span className="ml-1 text-[10px] text-text-muted">({c.nr_rate}x)</span>
                )}
              </td>
              <td className="px-3 py-2 text-right font-mono text-text-primary">
                {formatEur(c.valoare_lunara)}
              </td>
              <td className="px-3 py-2 text-text-secondary">
                {new Date(c.data_inceput).toLocaleDateString("ro-RO")}
              </td>
              <td className="px-3 py-2 text-text-secondary">
                {c.data_sfarsit ? new Date(c.data_sfarsit).toLocaleDateString("ro-RO") : "Nedeterminat"}
              </td>
              <td className="px-3 py-2 text-text-secondary">{c.stadiu_contract ?? "—"}</td>
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
              <td colSpan={11} className="px-3 py-8 text-center text-sm text-text-muted">
                Niciun contract inca.
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

function ContractFormModal({
  contract,
  clienti,
  produseOptions,
  serviciiOptions,
  modalitatiOptions,
  stadiiOptions,
  onClose,
}: {
  contract?: Contract;
  clienti: ClientOption[];
  produseOptions: Nomenclator[];
  serviciiOptions: Nomenclator[];
  modalitatiOptions: Nomenclator[];
  stadiiOptions: Nomenclator[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [partnerId, setPartnerId] = useState(contract?.partner_id ?? "");
  const [tipVenit, setTipVenit] = useState<TipVenit>(contract?.tip_venit ?? "Recurent");
  const [produs, setProdus] = useState(contract?.produs ?? "");
  const [serviciu, setServiciu] = useState(contract?.serviciu ?? "");
  const [valoare, setValoare] = useState(String(contract?.valoare_lunara ?? ""));
  const [dataInceput, setDataInceput] = useState(contract?.data_inceput ?? getTodayISO());
  const [durationMode, setDurationMode] = useState<DurationMode>(
    contract ? (contract.data_sfarsit ? "personalizat" : "nedeterminat") : "un_an"
  );
  const [dataSfarsitCustom, setDataSfarsitCustom] = useState(contract?.data_sfarsit ?? "");
  const [stadiuContract, setStadiuContract] = useState(contract?.stadiu_contract ?? "");
  const [statusContract, setStatusContract] = useState<ContractStatus>(
    contract?.status_contract ?? "Activ"
  );
  const [modalitateFacturare, setModalitateFacturare] = useState(contract?.modalitate_facturare ?? "");
  const [nrRate, setNrRate] = useState(String(contract?.nr_rate ?? 1));
  const [observatii, setObservatii] = useState(contract?.observatii ?? "");
  const [message, setMessage] = useState<string | null>(null);

  const selectedClient = clienti.find((c) => c.id === partnerId);

  function handleSave() {
    setMessage(null);

    if (!contract && !partnerId) {
      setMessage("Trebuie sa alegi un client din lista.");
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
        tip_venit: tipVenit,
        produs: produs || null,
        serviciu: serviciu || null,
        valoare_lunara: Number(valoare),
        nr_rate: tipVenit === "Nerecurent" ? Math.max(1, Number(nrRate) || 1) : 1,
        data_inceput: dataInceput,
        data_sfarsit: dataSfarsit,
        stadiu_contract: stadiuContract || null,
        modalitate_facturare: modalitateFacturare || null,
        observatii: observatii || null,
      };

      const result = contract
        ? await updateContractAction(contract.id, { ...fields, status_contract: statusContract })
        : await createContractAction({
            ...fields,
            partner_id: partnerId,
            nume_client: selectedClient?.nume ?? "",
          });

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
            {contract ? "Editeaza contract" : "Contract nou"}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        {contract && (
          <p className="mb-3 rounded-md border border-[#E8007A]/20 bg-[#E8007A]/5 px-3 py-2 text-[11px] text-text-primary">
            La salvare, toate liniile de venit ale acestui contract se regenereaza dupa noile setari.
            Realizatul deja inregistrat se pastreaza, acolo unde perioadele se suprapun.
          </p>
        )}

        <div className="space-y-3">
          <div>
            <label className={labelClass}>Client *</label>
            {contract ? (
              <p className="rounded-md border border-border-subtle bg-surface-1 px-2.5 py-2 text-sm text-text-primary">
                {contract.nume_client}
              </p>
            ) : (
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className={selectClass}
              >
                <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                  Alege clientul...
                </option>
                {clienti.map((c) => (
                  <option key={c.id} value={c.id} style={{ backgroundColor: "var(--surface-1)" }}>
                    {c.nume}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedClient && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-md border border-border-faint bg-surface-1 px-3 py-2 text-[11px] text-text-secondary">
              <span>
                Cod fiscal: <span className="text-text-primary">{selectedClient.cod_fiscal ?? "—"}</span>
              </span>
              <span>
                Tip activitate:{" "}
                <span className="text-text-primary">{selectedClient.domeniul_activitate ?? "—"}</span>
              </span>
              <span>
                Judet: <span className="text-text-primary">{selectedClient.judet ?? "—"}</span>
              </span>
              <span>
                Localitate: <span className="text-text-primary">{selectedClient.oras ?? "—"}</span>
              </span>
            </div>
          )}

          <div>
            <label className={labelClass}>Tip venit *</label>
            <select
              value={tipVenit}
              onChange={(e) => setTipVenit(e.target.value as TipVenit)}
              className={selectClass}
            >
              <option value="Recurent" style={{ backgroundColor: "var(--surface-1)" }}>
                Recurent
              </option>
              <option value="Nerecurent" style={{ backgroundColor: "var(--surface-1)" }}>
                Nerecurent
              </option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Produs</label>
              <select value={produs} onChange={(e) => setProdus(e.target.value)} className={selectClass}>
                <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                  —
                </option>
                {produseOptions.map((n) => (
                  <NomOption key={n.id} n={n} />
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Serviciu</label>
              <select value={serviciu} onChange={(e) => setServiciu(e.target.value)} className={selectClass}>
                <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                  —
                </option>
                {serviciiOptions.map((n) => (
                  <NomOption key={n.id} n={n} />
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>
              {tipVenit === "Recurent" ? "Valoare lunara (EUR, fara TVA)" : "Valoare (EUR, fara TVA)"}
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

          {tipVenit === "Recurent" && (
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
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Stadiu contract</label>
              <select
                value={stadiuContract}
                onChange={(e) => setStadiuContract(e.target.value)}
                className={selectClass}
              >
                <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                  —
                </option>
                {stadiiOptions.map((n) => (
                  <NomOption key={n.id} n={n} />
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status contract</label>
              <select
                value={statusContract}
                onChange={(e) => setStatusContract(e.target.value as ContractStatus)}
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
          </div>
          <p className="text-[11px] text-text-muted">
            Un contract &quot;Inactiv&quot; nu genereaza linii de venit - util pentru contracte introduse
            in avans, inainte sa se activeze.
          </p>

          <div>
            <label className={labelClass}>Modalitate facturare</label>
            <select
              value={modalitateFacturare}
              onChange={(e) => setModalitateFacturare(e.target.value)}
              className={selectClass}
            >
              <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                —
              </option>
              {modalitatiOptions.map((n) => (
                <NomOption key={n.id} n={n} />
              ))}
            </select>
          </div>

          {tipVenit === "Nerecurent" && (
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
                Se genereaza {nrRate || 1} {Number(nrRate) > 1 ? "linii lunare" : "linie"}, incepand cu
                data de inceput, cu valoarea impartita egal ({formatEur(Number(valoare || 0) / Math.max(1, Number(nrRate) || 1))} fiecare).
                Editezi apoi individual, pe fiecare linie, daca ratele nu sunt egale sau au alte date.
                Pentru Integral, lasa 1 rata.
              </p>
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

function ManualVenitFormModal({
  clienti,
  produseOptions,
  serviciiOptions,
  onClose,
}: {
  clienti: ClientOption[];
  produseOptions: Nomenclator[];
  serviciiOptions: Nomenclator[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [partnerId, setPartnerId] = useState("");
  const [tipVenit, setTipVenit] = useState<TipVenit>("Nerecurent");
  const [produs, setProdus] = useState("");
  const [serviciu, setServiciu] = useState("");
  const [venitEstimat, setVenitEstimat] = useState("");
  const [luna, setLuna] = useState(getTodayISO().slice(0, 7));
  const [observatii, setObservatii] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const selectedClient = clienti.find((c) => c.id === partnerId);

  function handleSave() {
    setMessage(null);
    if (!partnerId) {
      setMessage("Trebuie sa alegi un client din lista.");
      return;
    }
    startTransition(async () => {
      const result = await addVenitLinieManualAction({
        partner_id: partnerId,
        nume_client: selectedClient?.nume ?? "",
        tip_venit: tipVenit,
        produs: produs || null,
        serviciu: serviciu || null,
        venit_estimat: Number(venitEstimat),
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
          <h2 className="text-lg font-heading text-text-primary">Venit manual</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>
        <p className="mb-3 text-[11px] text-text-muted">
          O singura linie, independenta - util pentru o rata sau o etapa dintr-un contract cu
          facturare pe Rate/Etape, sau orice venit care nu se preteaza la generare automata.
        </p>

        <div className="space-y-3">
          <div>
            <label className={labelClass}>Client *</label>
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className={selectClass}
            >
              <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                Alege clientul...
              </option>
              {clienti.map((c) => (
                <option key={c.id} value={c.id} style={{ backgroundColor: "var(--surface-1)" }}>
                  {c.nume}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Tip venit</label>
            <select
              value={tipVenit}
              onChange={(e) => setTipVenit(e.target.value as TipVenit)}
              className={selectClass}
            >
              <option value="Recurent" style={{ backgroundColor: "var(--surface-1)" }}>
                Recurent
              </option>
              <option value="Nerecurent" style={{ backgroundColor: "var(--surface-1)" }}>
                Nerecurent
              </option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Produs</label>
              <select value={produs} onChange={(e) => setProdus(e.target.value)} className={selectClass}>
                <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                  —
                </option>
                {produseOptions.map((n) => (
                  <NomOption key={n.id} n={n} />
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Serviciu</label>
              <select value={serviciu} onChange={(e) => setServiciu(e.target.value)} className={selectClass}>
                <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                  —
                </option>
                {serviciiOptions.map((n) => (
                  <NomOption key={n.id} n={n} />
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Valoare (EUR, fara TVA)</label>
              <input
                type="number"
                step="0.01"
                value={venitEstimat}
                onChange={(e) => setVenitEstimat(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Luna</label>
              <input
                type="month"
                value={luna}
                onChange={(e) => setLuna(e.target.value)}
                className={inputClass}
              />
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

"use client";

import { useMemo, useState, useTransition } from "react";
import {
  TrendingUp,
  FileText,
  Plus,
  RefreshCw,
  Trash2,
  X,
  Check,
} from "lucide-react";
import { formatRon } from "@/lib/format";
import { getTodayISO } from "@/lib/date";
import {
  createContractAction,
  updateContractAction,
  deleteContractAction,
  addVenitNerecurentAction,
  updateVenitLinieAction,
  deleteVenitLinieAction,
  syncVenituriLiniiAction,
} from "@/lib/actions/venituri";
import type { Contract, VenitLinie, ContractStatus } from "@/types/venituri";

type ViewMode = "venituri" | "contracte";
type PeriodFilter = "luna_curenta" | "ultimele_3_luni" | "anul_curent" | "toate";

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "luna_curenta", label: "Luna curenta" },
  { value: "ultimele_3_luni", label: "Ultimele 3 luni" },
  { value: "anul_curent", label: "Anul curent" },
  { value: "toate", label: "Tot istoricul" },
];

function inPeriod(luna: string, period: PeriodFilter): boolean {
  if (period === "toate") return true;
  const d = new Date(luna);
  const now = new Date();
  if (period === "luna_curenta") {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (period === "anul_curent") return d.getFullYear() === now.getFullYear();
  if (period === "ultimele_3_luni") {
    const threshold = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return d >= threshold;
  }
  return true;
}

export function VenituriCheltuieliClient({
  contracte,
  venituriLinii,
}: {
  contracte: Contract[];
  venituriLinii: VenitLinie[];
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("venituri");
  const [period, setPeriod] = useState<PeriodFilter>("luna_curenta");
  const [isPending, startTransition] = useTransition();
  const [showContractForm, setShowContractForm] = useState(false);
  const [showNerecurentForm, setShowNerecurentForm] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const filteredLinii = useMemo(
    () => venituriLinii.filter((l) => inPeriod(l.luna, period)),
    [venituriLinii, period]
  );

  const summary = useMemo(() => {
    let estimat = 0;
    let realizat = 0;
    for (const l of filteredLinii) {
      estimat += l.venit_estimat;
      realizat += l.venit_realizat ?? 0;
    }
    return { estimat, realizat, diferenta: realizat - estimat };
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
          <h1 className="text-lg font-heading text-white">Venituri & Cheltuieli</h1>
          <p className="text-sm text-slate-500">
            Contracte recurente + venituri nerecurente, buget vs. realizat.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw size={13} />
              Genereaza linii lipsa
            </button>
            {viewMode === "contracte" ? (
              <button
                onClick={() => setShowContractForm(true)}
                className="flex items-center gap-1.5 rounded-md bg-[#E8007A] px-3 py-2 text-xs font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA]"
              >
                <Plus size={14} />
                Contract nou
              </button>
            ) : (
              <button
                onClick={() => setShowNerecurentForm(true)}
                className="flex items-center gap-1.5 rounded-md bg-[#E8007A] px-3 py-2 text-xs font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA]"
              >
                <Plus size={14} />
                Venit nerecurent
              </button>
            )}
          </div>
          {syncMessage && <p className="text-xs text-slate-500">{syncMessage}</p>}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs text-slate-500">Venit estimat (buget)</p>
          <p className="font-mono text-2xl font-medium text-white">{formatRon(summary.estimat)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs text-slate-500">Venit realizat</p>
          <p className="font-mono text-2xl font-medium text-white">{formatRon(summary.realizat)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs text-slate-500">Diferenta (realizat - estimat)</p>
          <p
            className={`font-mono text-2xl font-medium ${summary.diferenta >= 0 ? "text-green-400" : "text-red-400"}`}
          >
            {summary.diferenta >= 0 ? "+" : ""}
            {formatRon(summary.diferenta)}
          </p>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-md border border-white/10 p-0.5">
          <button
            onClick={() => setViewMode("venituri")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${
              viewMode === "venituri" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <TrendingUp size={13} />
            Venituri
          </button>
          <button
            onClick={() => setViewMode("contracte")}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${
              viewMode === "contracte" ? "bg-white/10 text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <FileText size={13} />
            Contracte
          </button>
        </div>
        {viewMode === "venituri" && (
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
        )}
      </div>

      {viewMode === "venituri" ? (
        <VenituriTable linii={filteredLinii} />
      ) : (
        <ContracteTable contracte={contracte} onEdit={setEditingContract} />
      )}

      {showContractForm && <ContractFormModal onClose={() => setShowContractForm(false)} />}
      {editingContract && (
        <ContractFormModal contract={editingContract} onClose={() => setEditingContract(null)} />
      )}
      {showNerecurentForm && <NerecurentFormModal onClose={() => setShowNerecurentForm(false)} />}
    </div>
  );
}

function VenituriTable({ linii }: { linii: VenitLinie[] }) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [valoare, setValoare] = useState("");

  function startEdit(l: VenitLinie) {
    setEditingId(l.id);
    setValoare(l.venit_realizat !== null ? String(l.venit_realizat) : "");
  }

  function handleSave(id: string) {
    const numeric = valoare === "" ? null : Number(valoare);
    startTransition(async () => {
      await updateVenitLinieAction(id, { venit_realizat: numeric });
      setEditingId(null);
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Stergi aceasta linie de venit?")) return;
    startTransition(async () => {
      await deleteVenitLinieAction(id);
    });
  }

  const sorted = [...linii].sort((a, b) => (a.luna < b.luna ? 1 : -1));

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.02] text-left text-[10px] uppercase text-slate-500">
            <th className="px-3 py-2">Client</th>
            <th className="px-3 py-2">Tip</th>
            <th className="px-3 py-2">Produs</th>
            <th className="px-3 py-2">Serviciu</th>
            <th className="px-3 py-2">Luna</th>
            <th className="px-3 py-2 text-right">Estimat</th>
            <th className="px-3 py-2 text-right">Realizat</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((l) => (
            <tr key={l.id} className="border-b border-white/5 hover:bg-white/[0.03]">
              <td className="px-3 py-2 text-white">{l.nume_client}</td>
              <td className="px-3 py-2 text-slate-400">{l.tip_venit}</td>
              <td className="px-3 py-2 text-slate-400">{l.produs ?? "—"}</td>
              <td className="px-3 py-2 text-slate-400">{l.serviciu ?? "—"}</td>
              <td className="px-3 py-2 text-slate-400">
                {new Date(l.luna).toLocaleDateString("ro-RO", { month: "short", year: "numeric" })}
              </td>
              <td className="px-3 py-2 text-right font-mono text-slate-300">
                {formatRon(l.venit_estimat)}
              </td>
              <td className="px-3 py-2 text-right">
                {editingId === l.id ? (
                  <div className="flex items-center justify-end gap-1">
                    <input
                      type="number"
                      step="0.01"
                      autoFocus
                      value={valoare}
                      onChange={(e) => setValoare(e.target.value)}
                      className="w-24 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-right text-sm text-white outline-none focus:border-[#E8007A]"
                    />
                    <button
                      onClick={() => handleSave(l.id)}
                      disabled={isPending}
                      className="rounded-md p-1 text-green-400 hover:bg-green-500/10"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="rounded-md p-1 text-slate-500 hover:bg-white/5"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startEdit(l)}
                    className="font-mono text-white hover:text-[#E8007A]"
                    title="Click pentru a edita"
                  >
                    {l.venit_realizat !== null ? formatRon(l.venit_realizat) : "—"}
                  </button>
                )}
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  onClick={() => handleDelete(l.id)}
                  className="rounded-md p-1 text-slate-600 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                Nicio linie de venit pentru filtrul curent.
              </td>
            </tr>
          )}
        </tbody>
      </table>
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

  function handleDelete(id: string) {
    if (!confirm("Stergi acest contract? Liniile de venit deja generate raman, dar se detaseaza de contract."))
      return;
    startTransition(async () => {
      await deleteContractAction(id);
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.02] text-left text-[10px] uppercase text-slate-500">
            <th className="px-3 py-2">Client</th>
            <th className="px-3 py-2">Produs</th>
            <th className="px-3 py-2">Serviciu</th>
            <th className="px-3 py-2 text-right">Valoare lunara</th>
            <th className="px-3 py-2">Inceput</th>
            <th className="px-3 py-2">Sfarsit</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {contracte.map((c) => (
            <tr
              key={c.id}
              onClick={() => onEdit(c)}
              className="cursor-pointer border-b border-white/5 hover:bg-white/[0.03]"
            >
              <td className="px-3 py-2 text-white">{c.nume_client}</td>
              <td className="px-3 py-2 text-slate-400">{c.produs ?? "—"}</td>
              <td className="px-3 py-2 text-slate-400">{c.serviciu ?? "—"}</td>
              <td className="px-3 py-2 text-right font-mono text-white">
                {formatRon(c.valoare_lunara)}
              </td>
              <td className="px-3 py-2 text-slate-400">
                {new Date(c.data_inceput).toLocaleDateString("ro-RO")}
              </td>
              <td className="px-3 py-2 text-slate-400">
                {c.data_sfarsit ? new Date(c.data_sfarsit).toLocaleDateString("ro-RO") : "Nedeterminat"}
              </td>
              <td className="px-3 py-2">
                <span
                  className={
                    c.status === "Activ"
                      ? "text-green-400"
                      : c.status === "Suspendat"
                        ? "text-amber-400"
                        : "text-slate-500"
                  }
                >
                  {c.status}
                </span>
              </td>
              <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={isPending}
                  className="rounded-md p-1 text-slate-600 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
          {contracte.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center text-sm text-slate-500">
                Niciun contract inca.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ContractFormModal({
  contract,
  onClose,
}: {
  contract?: Contract;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [numeClient, setNumeClient] = useState(contract?.nume_client ?? "");
  const [produs, setProdus] = useState(contract?.produs ?? "");
  const [serviciu, setServiciu] = useState(contract?.serviciu ?? "");
  const [valoareLunara, setValoareLunara] = useState(String(contract?.valoare_lunara ?? ""));
  const [dataInceput, setDataInceput] = useState(contract?.data_inceput ?? getTodayISO());
  const [dataSfarsit, setDataSfarsit] = useState(contract?.data_sfarsit ?? "");
  const [status, setStatus] = useState<ContractStatus>(contract?.status ?? "Activ");
  const [observatii, setObservatii] = useState(contract?.observatii ?? "");
  const [message, setMessage] = useState<string | null>(null);

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const fields = {
        nume_client: numeClient,
        produs: produs || null,
        serviciu: serviciu || null,
        valoare_lunara: Number(valoareLunara),
        data_sfarsit: dataSfarsit || null,
        observatii: observatii || null,
      };
      const result = contract
        ? await updateContractAction(contract.id, { ...fields, status })
        : await createContractAction({ ...fields, data_inceput: dataInceput });

      if (result.success) onClose();
      else setMessage(result.message ?? "Eroare la salvare.");
    });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-white/10 bg-[#111535] p-5"
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-heading text-white">
            {contract ? "Editeaza contract" : "Contract nou"}
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] text-slate-500">Client</label>
            <input
              value={numeClient}
              onChange={(e) => setNumeClient(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">Produs</label>
              <input
                value={produs}
                onChange={(e) => setProdus(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">Serviciu</label>
              <input
                value={serviciu}
                onChange={(e) => setServiciu(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-slate-500">Valoare lunara (lei)</label>
            <input
              type="number"
              step="0.01"
              value={valoareLunara}
              onChange={(e) => setValoareLunara(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
            />
            {contract && (
              <p className="mt-1 text-[11px] text-slate-500">
                Schimbarea valorii afecteaza doar lunile viitoare, inca negenerate.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">Data inceput</label>
              <input
                type="date"
                value={dataInceput}
                onChange={(e) => setDataInceput(e.target.value)}
                disabled={!!contract}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none focus:border-[#E8007A] disabled:opacity-50"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">Data sfarsit (optional)</label>
              <input
                type="date"
                value={dataSfarsit}
                onChange={(e) => setDataSfarsit(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
              />
            </div>
          </div>
          {contract && (
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ContractStatus)}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
              >
                {(["Activ", "Suspendat", "Inactiv"] as ContractStatus[]).map((s) => (
                  <option key={s} value={s} style={{ backgroundColor: "#111535" }}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-[11px] text-slate-500">Observatii</label>
            <textarea
              value={observatii}
              onChange={(e) => setObservatii(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
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

function NerecurentFormModal({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [numeClient, setNumeClient] = useState("");
  const [produs, setProdus] = useState("");
  const [serviciu, setServiciu] = useState("");
  const [venitEstimat, setVenitEstimat] = useState("");
  const [luna, setLuna] = useState(getTodayISO().slice(0, 7));
  const [observatii, setObservatii] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await addVenitNerecurentAction({
        nume_client: numeClient,
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
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-white/10 bg-[#111535] p-5"
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-heading text-white">Venit nerecurent nou</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] text-slate-500">Client</label>
            <input
              value={numeClient}
              onChange={(e) => setNumeClient(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">Produs</label>
              <input
                value={produs}
                onChange={(e) => setProdus(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">Serviciu</label>
              <input
                value={serviciu}
                onChange={(e) => setServiciu(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">Valoare (lei)</label>
              <input
                type="number"
                step="0.01"
                value={venitEstimat}
                onChange={(e) => setVenitEstimat(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">Luna</label>
              <input
                type="month"
                value={luna}
                onChange={(e) => setLuna(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-slate-500">Observatii</label>
            <textarea
              value={observatii}
              onChange={(e) => setObservatii(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
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

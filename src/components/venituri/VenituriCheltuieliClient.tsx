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
  Pencil,
} from "lucide-react";
import { formatEur } from "@/lib/format";
import { getTodayISO } from "@/lib/date";
import {
  createContractAction,
  updateContractAction,
  deleteContractAction,
  updateVenitLinieAction,
  deleteVenitLinieAction,
  syncVenituriLiniiAction,
} from "@/lib/actions/venituri";
import type { Contract, VenitLinie, ContractStatus, TipVenit } from "@/types/venituri";
import type { OpportunityOption } from "@/lib/data/venituri";
import type { Nomenclator } from "@/types/opportunity";

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

const selectClass =
  "w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none focus:border-[#E8007A]";
const inputClass = selectClass;
const labelClass = "mb-1 block text-[11px] text-slate-500";

function NomOption({ n }: { n: Nomenclator }) {
  return (
    <option value={n.valoare} style={{ backgroundColor: "#111535" }}>
      {n.valoare}
    </option>
  );
}

export function VenituriCheltuieliClient({
  contracte,
  venituriLinii,
  opportunities,
  produseOptions,
  serviciiOptions,
  modalitatiOptions,
  stadiiOptions,
}: {
  contracte: Contract[];
  venituriLinii: VenitLinie[];
  opportunities: OpportunityOption[];
  produseOptions: Nomenclator[];
  serviciiOptions: Nomenclator[];
  modalitatiOptions: Nomenclator[];
  stadiiOptions: Nomenclator[];
}) {
  const [viewMode, setViewMode] = useState<ViewMode>("venituri");
  const [period, setPeriod] = useState<PeriodFilter>("luna_curenta");
  const [isPending, startTransition] = useTransition();
  const [showContractForm, setShowContractForm] = useState(false);
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
            Contracte (recurente si nerecurente), buget vs. realizat. Toate valorile in EUR, fara TVA.
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
            <button
              onClick={() => setShowContractForm(true)}
              className="flex items-center gap-1.5 rounded-md bg-[#E8007A] px-3 py-2 text-xs font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA]"
            >
              <Plus size={14} />
              Contract nou
            </button>
          </div>
          {syncMessage && <p className="text-xs text-slate-500">{syncMessage}</p>}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs text-slate-500">Venit estimat (buget)</p>
          <p className="font-mono text-2xl font-medium text-white">{formatEur(summary.estimat)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs text-slate-500">Venit realizat</p>
          <p className="font-mono text-2xl font-medium text-white">{formatEur(summary.realizat)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs text-slate-500">Diferenta (realizat - estimat)</p>
          <p
            className={`font-mono text-2xl font-medium ${summary.diferenta >= 0 ? "text-green-400" : "text-red-400"}`}
          >
            {summary.diferenta >= 0 ? "+" : ""}
            {formatEur(summary.diferenta)}
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
        <VenituriTable
          linii={filteredLinii}
          produseOptions={produseOptions}
          serviciiOptions={serviciiOptions}
        />
      ) : (
        <ContracteTable contracte={contracte} onEdit={setEditingContract} />
      )}

      {showContractForm && (
        <ContractFormModal
          opportunities={opportunities}
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
          opportunities={opportunities}
          produseOptions={produseOptions}
          serviciiOptions={serviciiOptions}
          modalitatiOptions={modalitatiOptions}
          stadiiOptions={stadiiOptions}
          onClose={() => setEditingContract(null)}
        />
      )}
    </div>
  );
}

function VenituriTable({
  linii,
  produseOptions,
  serviciiOptions,
}: {
  linii: VenitLinie[];
  produseOptions: Nomenclator[];
  serviciiOptions: Nomenclator[];
}) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [produs, setProdus] = useState("");
  const [serviciu, setServiciu] = useState("");
  const [venitEstimat, setVenitEstimat] = useState("");
  const [venitRealizat, setVenitRealizat] = useState("");
  const [facturat, setFacturat] = useState(false);

  function startEdit(l: VenitLinie) {
    setEditingId(l.id);
    setProdus(l.produs ?? "");
    setServiciu(l.serviciu ?? "");
    setVenitEstimat(String(l.venit_estimat));
    setVenitRealizat(l.venit_realizat !== null ? String(l.venit_realizat) : "");
    setFacturat(l.facturat);
  }

  function handleSave(id: string) {
    startTransition(async () => {
      await updateVenitLinieAction(id, {
        produs: produs || null,
        serviciu: serviciu || null,
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
          {sorted.map((l) => {
            const isEditing = editingId === l.id;
            return (
              <tr key={l.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="px-3 py-2 text-white">{l.nume_client}</td>
                <td className="px-3 py-2 text-slate-400">{l.tip_venit}</td>
                <td className="px-3 py-2 text-slate-400">
                  {isEditing ? (
                    <select value={produs} onChange={(e) => setProdus(e.target.value)} className={selectClass}>
                      <option value="" style={{ backgroundColor: "#111535" }}>
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
                <td className="px-3 py-2 text-slate-400">
                  {isEditing ? (
                    <select value={serviciu} onChange={(e) => setServiciu(e.target.value)} className={selectClass}>
                      <option value="" style={{ backgroundColor: "#111535" }}>
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
                <td className="px-3 py-2 text-slate-400">
                  {new Date(l.luna).toLocaleDateString("ro-RO", { month: "short", year: "numeric" })}
                </td>
                <td className="px-3 py-2 text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={venitEstimat}
                      onChange={(e) => setVenitEstimat(e.target.value)}
                      className="w-24 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-right text-sm text-white outline-none focus:border-[#E8007A]"
                    />
                  ) : (
                    <span className="font-mono text-slate-300">{formatEur(l.venit_estimat)}</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={venitRealizat}
                      onChange={(e) => setVenitRealizat(e.target.value)}
                      className="w-24 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-right text-sm text-white outline-none focus:border-[#E8007A]"
                    />
                  ) : (
                    <span className="font-mono text-white">
                      {l.venit_realizat !== null ? formatEur(l.venit_realizat) : "—"}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {isEditing ? (
                    <div className="flex items-center justify-end gap-1">
                      <label className="mr-1 flex items-center gap-1 text-[11px] text-slate-400">
                        <input
                          type="checkbox"
                          checked={facturat}
                          onChange={(e) => setFacturat(e.target.checked)}
                          className="h-3.5 w-3.5"
                        />
                        Facturat
                      </label>
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
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => startEdit(l)}
                        className="rounded-md p-1 text-slate-500 hover:bg-white/5 hover:text-[#E8007A]"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(l.id)}
                        className="rounded-md p-1 text-slate-600 hover:bg-red-500/10 hover:text-red-400"
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
    if (
      !confirm("Stergi acest contract? Liniile de venit deja generate raman, dar se detaseaza de contract.")
    )
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
            <th className="px-3 py-2">Tip venit</th>
            <th className="px-3 py-2">Produs</th>
            <th className="px-3 py-2">Serviciu</th>
            <th className="px-3 py-2 text-right">Valoare</th>
            <th className="px-3 py-2">Inceput</th>
            <th className="px-3 py-2">Sfarsit</th>
            <th className="px-3 py-2">Stadiu</th>
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
              <td className="px-3 py-2 text-slate-400">{c.tip_venit}</td>
              <td className="px-3 py-2 text-slate-400">{c.produs ?? "—"}</td>
              <td className="px-3 py-2 text-slate-400">{c.serviciu ?? "—"}</td>
              <td className="px-3 py-2 text-right font-mono text-white">
                {formatEur(c.valoare_lunara)}
              </td>
              <td className="px-3 py-2 text-slate-400">
                {new Date(c.data_inceput).toLocaleDateString("ro-RO")}
              </td>
              <td className="px-3 py-2 text-slate-400">
                {c.data_sfarsit ? new Date(c.data_sfarsit).toLocaleDateString("ro-RO") : "Nedeterminat"}
              </td>
              <td className="px-3 py-2 text-slate-400">{c.stadiu_contract ?? "—"}</td>
              <td className="px-3 py-2">
                <span className={c.status_contract === "Activ" ? "text-green-400" : "text-slate-500"}>
                  {c.status_contract}
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
              <td colSpan={10} className="px-3 py-8 text-center text-sm text-slate-500">
                Niciun contract inca.
              </td>
            </tr>
          )}
        </tbody>
      </table>
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
  opportunities,
  produseOptions,
  serviciiOptions,
  modalitatiOptions,
  stadiiOptions,
  onClose,
}: {
  contract?: Contract;
  opportunities: OpportunityOption[];
  produseOptions: Nomenclator[];
  serviciiOptions: Nomenclator[];
  modalitatiOptions: Nomenclator[];
  stadiiOptions: Nomenclator[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [opportunityId, setOpportunityId] = useState(contract?.opportunity_id ?? "");
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
  const [observatii, setObservatii] = useState(contract?.observatii ?? "");
  const [message, setMessage] = useState<string | null>(null);

  const selectedOpportunity = opportunities.find((o) => o.id === opportunityId);

  function handleSave() {
    setMessage(null);

    if (!contract && !opportunityId) {
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
        produs: produs || null,
        serviciu: serviciu || null,
        valoare_lunara: Number(valoare),
        data_sfarsit: dataSfarsit,
        stadiu_contract: stadiuContract || null,
        modalitate_facturare: modalitateFacturare || null,
        observatii: observatii || null,
      };

      const result = contract
        ? await updateContractAction(contract.id, { ...fields, status_contract: statusContract })
        : await createContractAction({
            ...fields,
            opportunity_id: opportunityId,
            nume_client: selectedOpportunity?.nume_potential ?? "",
            tip_venit: tipVenit,
            data_inceput: dataInceput,
          });

      if (result.success) onClose();
      else setMessage(result.message ?? "Eroare la salvare.");
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-[#111535] p-5"
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
            <label className={labelClass}>Client *</label>
            {contract ? (
              <p className="rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-2 text-sm text-white">
                {contract.nume_client}
              </p>
            ) : (
              <select
                value={opportunityId}
                onChange={(e) => setOpportunityId(e.target.value)}
                className={selectClass}
              >
                <option value="" style={{ backgroundColor: "#111535" }}>
                  Alege clientul...
                </option>
                {opportunities.map((o) => (
                  <option key={o.id} value={o.id} style={{ backgroundColor: "#111535" }}>
                    {o.nume_potential}
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedOpportunity && (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-md border border-white/5 bg-white/[0.02] px-3 py-2 text-[11px] text-slate-400">
              <span>
                Grup: <span className="text-slate-300">{selectedOpportunity.nume_grup}</span>
              </span>
              <span>
                Tip activitate:{" "}
                <span className="text-slate-300">{selectedOpportunity.domeniul_activitate ?? "—"}</span>
              </span>
              <span>
                Judet: <span className="text-slate-300">{selectedOpportunity.judet ?? "—"}</span>
              </span>
              <span>
                Localitate: <span className="text-slate-300">{selectedOpportunity.oras ?? "—"}</span>
              </span>
            </div>
          )}

          <div>
            <label className={labelClass}>Tip venit *</label>
            <select
              value={tipVenit}
              onChange={(e) => setTipVenit(e.target.value as TipVenit)}
              disabled={!!contract}
              className={`${selectClass} disabled:opacity-50`}
            >
              <option value="Recurent" style={{ backgroundColor: "#111535" }}>
                Recurent
              </option>
              <option value="Nerecurent" style={{ backgroundColor: "#111535" }}>
                Nerecurent
              </option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Produs</label>
              <select value={produs} onChange={(e) => setProdus(e.target.value)} className={selectClass}>
                <option value="" style={{ backgroundColor: "#111535" }}>
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
                <option value="" style={{ backgroundColor: "#111535" }}>
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
            {contract && (
              <p className="mt-1 text-[11px] text-slate-500">
                Schimbarea valorii afecteaza doar lunile viitoare, inca negenerate.
              </p>
            )}
          </div>

          <div>
            <label className={labelClass}>Data inceput</label>
            <input
              type="date"
              value={dataInceput}
              onChange={(e) => setDataInceput(e.target.value)}
              disabled={!!contract}
              className={`${inputClass} disabled:opacity-50`}
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
                        : "border border-white/10 text-slate-400 hover:bg-white/5"
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
                <p className="mt-1 text-[11px] text-slate-500">
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
                <option value="" style={{ backgroundColor: "#111535" }}>
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
                <option value="Activ" style={{ backgroundColor: "#111535" }}>
                  Activ
                </option>
                <option value="Inactiv" style={{ backgroundColor: "#111535" }}>
                  Inactiv
                </option>
              </select>
            </div>
          </div>
          <p className="text-[11px] text-slate-500">
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
              <option value="" style={{ backgroundColor: "#111535" }}>
                —
              </option>
              {modalitatiOptions.map((n) => (
                <NomOption key={n.id} n={n} />
              ))}
            </select>
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

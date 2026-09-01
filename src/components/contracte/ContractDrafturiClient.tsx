"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Trash2, FlaskConical, Download } from "lucide-react";
import { uploadContractDraftAction, toggleActivDraftAction, stergeDraftAction, genereazaContractTestAction } from "@/lib/actions/contracte";
import type { ContractDraft } from "@/types/contracte";
import type { Nomenclator } from "@/types/opportunity";

export function ContractDrafturiClient({
  drafturi,
  produseServicii,
  tipuriContract,
  parteneri,
}: {
  drafturi: ContractDraft[];
  produseServicii: Nomenclator[];
  tipuriContract: Nomenclator[];
  parteneri: { id: string; nume: string; cod_fiscal: string | null }[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [testDraft, setTestDraft] = useState<ContractDraft | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleToggle(id: string, activ: boolean) {
    startTransition(async () => {
      const result = await toggleActivDraftAction(id, activ);
      setMessage(result.message ?? (result.success ? "Salvat." : "Eroare."));
    });
  }

  function handleDelete(id: string, nume: string) {
    if (!confirm(`Stergi draft-ul "${nume}"? Fisierul se sterge definitiv.`)) return;
    startTransition(async () => {
      const result = await stergeDraftAction(id);
      setMessage(result.message ?? (result.success ? "Sters." : "Eroare."));
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-heading text-text-primary">Draft-uri contracte</h1>
          <p className="text-xs text-text-secondary">
            Document .docx cu placeholder-uri {"{{tag}}"}, unul per tip de contract / produs.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA]"
        >
          <Plus size={14} />
          Draft nou
        </button>
      </div>

      {message && (
        <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-300">
          {message}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border-subtle">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-1 text-left text-xs font-medium text-text-secondary">
              <th className="px-3 py-2">Nume</th>
              <th className="px-3 py-2">Tip contract</th>
              <th className="px-3 py-2">Produs/Serviciu</th>
              <th className="px-3 py-2 text-right">Versiune</th>
              <th className="px-3 py-2">Stare</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {drafturi.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-xs text-text-secondary">
                  Niciun draft incarcat inca.
                </td>
              </tr>
            )}
            {drafturi.map((d) => {
              const produs = produseServicii.find((p) => p.id === d.produs_serviciu_id);
              const tip = tipuriContract.find((t) => t.id === d.tip_contract_id);
              return (
                <tr key={d.id} className={`border-b border-border-faint hover:bg-surface-1 ${!d.activ ? "opacity-50" : ""}`}>
                  <td className="px-3 py-2 font-medium text-text-primary">{d.nume}</td>
                  <td className="px-3 py-2 text-text-secondary">{tip?.valoare ?? "—"}</td>
                  <td className="px-3 py-2 text-text-secondary">{produs?.valoare ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-mono text-text-primary">v{d.versiune}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleToggle(d.id, !d.activ)}
                      disabled={isPending}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition disabled:opacity-50 ${
                        d.activ ? "bg-green-500/15 text-green-400 hover:bg-green-500/25" : "bg-surface-2 text-text-secondary hover:bg-surface-1"
                      }`}
                      title="Click pentru a schimba starea"
                    >
                      {d.activ ? "Activ" : "Inactiv"}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => setTestDraft(d)}
                      className="mr-1 rounded-md p-1 text-text-secondary hover:bg-[#E8007A]/15 hover:text-[#E8007A]"
                      title="Testeaza completarea cu un partener"
                    >
                      <FlaskConical size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(d.id, d.nume)}
                      className="rounded-md p-1 text-text-secondary hover:bg-red-500/15 hover:text-red-400"
                      title="Sterge draft-ul"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <UploadDraftModal
          produseServicii={produseServicii}
          tipuriContract={tipuriContract}
          onClose={() => setShowForm(false)}
          onSaved={(msg) => {
            setMessage(msg);
            setShowForm(false);
          }}
        />
      )}

      {testDraft && (
        <TestGenerareModal
          draft={testDraft}
          parteneri={parteneri}
          onClose={() => setTestDraft(null)}
        />
      )}
    </div>
  );
}

function UploadDraftModal({
  produseServicii,
  tipuriContract,
  onClose,
  onSaved,
}: {
  produseServicii: Nomenclator[];
  tipuriContract: Nomenclator[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [nume, setNume] = useState("");
  const [tipContractId, setTipContractId] = useState(tipuriContract[0]?.id ?? "");
  const [produsId, setProdusId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleSubmit() {
    const file = fileRef.current?.files?.[0];
    if (!file || !nume.trim() || !tipContractId) return;

    const formData = new FormData();
    formData.set("file", file);
    formData.set("nume", nume.trim());
    formData.set("tip_contract_id", tipContractId);
    if (produsId) formData.set("produs_serviciu_id", produsId);

    startTransition(async () => {
      const result = await uploadContractDraftAction(formData);
      onSaved(result.message);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border-subtle bg-surface-1 p-4">
        <h2 className="mb-3 text-sm font-medium text-text-primary">Draft nou de contract</h2>
        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Nume (ex. „Implementare SYNERGO&rdquo;)</label>
            <input
              value={nume}
              onChange={(e) => setNume(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Tip contract</label>
            <select
              value={tipContractId}
              onChange={(e) => setTipContractId(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            >
              {tipuriContract.length === 0 && (
                <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                  Niciun tip disponibil - adauga in Nomenclatoare
                </option>
              )}
              {tipuriContract.map((t) => (
                <option key={t.id} value={t.id} style={{ backgroundColor: "var(--surface-1)" }}>
                  {t.valoare}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Produs/Serviciu (optional)</label>
            <select
              value={produsId}
              onChange={(e) => setProdusId(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            >
              <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                — Fara asociere —
              </option>
              {produseServicii.map((p) => (
                <option key={p.id} value={p.id} style={{ backgroundColor: "var(--surface-1)" }}>
                  {p.valoare}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Fisier (.docx)</label>
            <input
              ref={fileRef}
              type="file"
              accept=".docx"
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            />
          </div>
          <p className="text-[11px] text-text-secondary">
            Daca exista deja un draft activ cu acelasi nume, va fi dezactivat automat (ramane in istoric) si acesta devine noua versiune.
          </p>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-secondary">
            Anuleaza
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !nume.trim() || !tipContractId}
            className="rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] disabled:opacity-50"
          >
            {isPending ? "Se incarca..." : "Incarca draft-ul"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TestGenerareModal({
  draft,
  parteneri,
  onClose,
}: {
  draft: ContractDraft;
  parteneri: { id: string; nume: string; cod_fiscal: string | null }[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [partnerId, setPartnerId] = useState("");
  const [rezultat, setRezultat] = useState<{ success: boolean; message: string; downloadUrl?: string } | null>(null);

  function handleGenerate() {
    if (!partnerId) return;
    setRezultat(null);
    startTransition(async () => {
      const result = await genereazaContractTestAction(partnerId, draft.id);
      setRezultat(result);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border-subtle bg-surface-1 p-4">
        <h2 className="mb-1 text-sm font-medium text-text-primary">Testeaza generarea</h2>
        <p className="mb-3 text-xs text-text-secondary">Draft: {draft.nume}</p>

        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Partener</label>
            <select
              value={partnerId}
              onChange={(e) => {
                setPartnerId(e.target.value);
                setRezultat(null);
              }}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            >
              <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                Selecteaza un partener...
              </option>
              {parteneri.map((p) => (
                <option key={p.id} value={p.id} style={{ backgroundColor: "var(--surface-1)" }}>
                  {p.nume}
                  {p.cod_fiscal ? ` (CUI ${p.cod_fiscal})` : ""}
                </option>
              ))}
            </select>
          </div>

          <p className="text-[11px] text-text-secondary">
            Completeaza doar campurile simple (nume, CUI, adresa, reprezentant etc.) direct din fisa partenerului -
            fara clauze variabile inca. Placeholder-ele fara valoare in fisa raman marcate cu &quot;___&quot;.
          </p>
        </div>

        {rezultat && (
          <div
            className={`mt-3 rounded-md border px-3 py-2 text-sm ${
              rezultat.success ? "border-green-500/40 bg-green-500/10 text-green-400" : "border-red-500/40 bg-red-500/10 text-red-400"
            }`}
          >
            {rezultat.message}
            {rezultat.downloadUrl && (
              <a
                href={rezultat.downloadUrl}
                download
                className="mt-2 flex items-center gap-1.5 text-[#E8007A] hover:underline"
              >
                <Download size={13} />
                Descarca documentul generat
              </a>
            )}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-secondary">
            Inchide
          </button>
          <button
            onClick={handleGenerate}
            disabled={isPending || !partnerId}
            className="rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] disabled:opacity-50"
          >
            {isPending ? "Se genereaza..." : "Genereaza"}
          </button>
        </div>
      </div>
    </div>
  );
}

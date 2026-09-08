"use client";

import { useState, useTransition } from "react";
import { FileText, Download, FlaskConical } from "lucide-react";
import { genereazaContractTestAction, type DateFinanciareContract } from "@/lib/actions/contracte";
import { STATUS_CONTRACT_LABELS } from "@/types/contracte";
import type { ContractDraft, ContractGenerat } from "@/types/contracte";
import type { Nomenclator } from "@/types/opportunity";

export function ContractCard({
  opportunityId,
  partnerId,
  numePartener,
  esteCastigata,
  drafturi,
  tipuriServiciu,
  contracteExistente,
}: {
  opportunityId: string;
  partnerId: string | null;
  numePartener: string;
  esteCastigata: boolean;
  drafturi: ContractDraft[];
  tipuriServiciu: Nomenclator[];
  contracteExistente: { contract: ContractGenerat; downloadUrl: string | null }[];
}) {
  const [showForm, setShowForm] = useState(false);

  if (!esteCastigata && contracteExistente.length === 0) return null;

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
          <FileText size={13} />
          Contract
        </p>
        {esteCastigata && partnerId && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-md bg-[#E8007A] px-2.5 py-1 text-xs font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA]"
          >
            Genereaza contract
          </button>
        )}
      </div>

      {esteCastigata && !partnerId && (
        <p className="text-xs text-amber-400">
          Aceasta oportunitate nu e legata inca de un partener din CRM - leaga-o intai, ca sa poti genera contractul.
        </p>
      )}

      {contracteExistente.length === 0 ? (
        <p className="text-xs text-text-muted">Niciun contract generat inca pentru aceasta oportunitate.</p>
      ) : (
        <div className="space-y-1.5">
          {contracteExistente.map(({ contract, downloadUrl }) => (
            <div key={contract.id} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2 text-sm">
              <span className="text-text-primary">
                {new Date(contract.created_at).toLocaleDateString("ro-RO")} ·{" "}
                <span className="text-text-secondary">{STATUS_CONTRACT_LABELS[contract.status]}</span>
              </span>
              {downloadUrl && (
                <a href={downloadUrl} download className="text-[#E8007A] hover:underline">
                  <Download size={14} />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && partnerId && (
        <GenerareContractModal
          opportunityId={opportunityId}
          partnerId={partnerId}
          numePartener={numePartener}
          drafturi={drafturi}
          tipuriServiciu={tipuriServiciu}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}

function GenerareContractModal({
  opportunityId,
  partnerId,
  numePartener,
  drafturi,
  tipuriServiciu,
  onClose,
}: {
  opportunityId: string;
  partnerId: string;
  numePartener: string;
  drafturi: ContractDraft[];
  tipuriServiciu: Nomenclator[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [draftId, setDraftId] = useState(drafturi.find((d) => d.activ)?.id ?? "");
  const [rezultat, setRezultat] = useState<{
    success: boolean;
    message: string;
    downloadUrl?: string;
    noteValidare?: string;
  } | null>(null);

  const draftSelectat = drafturi.find((d) => d.id === draftId);
  const tipServiciu = tipuriServiciu.find((t) => t.id === draftSelectat?.tip_contract_id)?.valoare?.toUpperCase() ?? "";
  const esteImplementare = tipServiciu.includes("IMPLEMENTARE");
  const esteSaas = tipServiciu.includes("SAAS");

  const [valoareTotala, setValoareTotala] = useState("");
  const [nrUseri1, setNrUseri1] = useState("");
  const [nrUseri2, setNrUseri2] = useState("");
  const [valoarePerUser, setValoarePerUser] = useState("");

  function handleGenerate() {
    if (!draftId) return;
    setRezultat(null);

    let dateFinanciare: DateFinanciareContract = null;
    if (esteImplementare && valoareTotala) {
      dateFinanciare = { tip: "implementare", valoareTotala: Number(valoareTotala) };
    } else if (esteSaas && nrUseri1 && valoarePerUser) {
      dateFinanciare = {
        tip: "saas",
        nrUseri1: Number(nrUseri1),
        nrUseri2: Number(nrUseri2) || 0,
        valoarePerUser: Number(valoarePerUser),
      };
    }

    startTransition(async () => {
      const result = await genereazaContractTestAction(partnerId, draftId, dateFinanciare, opportunityId);
      setRezultat(result);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border-subtle bg-surface-1 p-4">
        <h2 className="mb-1 text-sm font-medium text-text-primary">Genereaza contract</h2>
        <p className="mb-3 text-xs text-text-secondary">Partener: {numePartener}</p>

        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Draft</label>
            <select
              value={draftId}
              onChange={(e) => setDraftId(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            >
              {drafturi.filter((d) => d.activ).length === 0 && (
                <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                  Niciun draft activ disponibil
                </option>
              )}
              {drafturi
                .filter((d) => d.activ)
                .map((d) => (
                  <option key={d.id} value={d.id} style={{ backgroundColor: "var(--surface-1)" }}>
                    {d.nume}
                  </option>
                ))}
            </select>
          </div>

          {esteImplementare && (
            <div>
              <label className="mb-1 block text-xs text-text-secondary">
                Valoare totala contract (EUR) — calculeaza automat cele 4 transe de 25%
              </label>
              <input
                type="number"
                value={valoareTotala}
                onChange={(e) => setValoareTotala(e.target.value)}
                placeholder="ex. 10000"
                className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
              />
            </div>
          )}

          {esteSaas && (
            <div className="space-y-2">
              <p className="text-xs text-text-secondary">Abonament lunar — calculeaza automat totalurile</p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={nrUseri1}
                  onChange={(e) => setNrUseri1(e.target.value)}
                  placeholder="Nr. useri Synergo Cloud"
                  className="rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
                />
                <input
                  type="number"
                  value={nrUseri2}
                  onChange={(e) => setNrUseri2(e.target.value)}
                  placeholder="Nr. useri modul financiar"
                  className="rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
                />
              </div>
              <input
                type="number"
                value={valoarePerUser}
                onChange={(e) => setValoarePerUser(e.target.value)}
                placeholder="Valoare/utilizator (EUR)"
                className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
              />
            </div>
          )}
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

        {rezultat?.noteValidare && (
          <div className="mt-2 rounded-md border border-border-subtle bg-surface-2 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-text-primary">
              <FlaskConical size={13} className="text-[#E8007A]" />
              Verificare Claude
            </p>
            <p className="whitespace-pre-line text-xs text-text-secondary">{rezultat.noteValidare}</p>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-secondary">
            {rezultat?.success ? "Inchide" : "Anuleaza"}
          </button>
          {!rezultat?.success && (
            <button
              onClick={handleGenerate}
              disabled={isPending || !draftId}
              className="rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] disabled:opacity-50"
            >
              {isPending ? "Se genereaza..." : "Genereaza"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

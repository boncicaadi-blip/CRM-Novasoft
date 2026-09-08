"use client";

import { useRef, useState, useTransition } from "react";
import { Download, Pencil, Trash2, Upload } from "lucide-react";
import {
  actualizeazaContractGeneratAction,
  stergeContractGeneratAction,
  inlocuiesteFisierContractGeneratAction,
} from "@/lib/actions/contracte";
import { STATUS_CONTRACT_LABELS } from "@/types/contracte";
import type { ContractGenerat, StatusContractGenerat } from "@/types/contracte";

interface Rand {
  contract: ContractGenerat;
  draftNume: string | null;
  tipNume: string | null;
  downloadUrl: string | null;
}

export function ContracteGenerateClient({
  randuri,
  parteneri,
}: {
  randuri: Rand[];
  parteneri: { id: string; nume: string; cod_fiscal: string | null }[];
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [editand, setEditand] = useState<Rand | null>(null);
  const [isPending, startTransition] = useTransition();

  const numeAfisat = (partnerId: string | null) => parteneri.find((p) => p.id === partnerId)?.nume ?? "—";

  function handleDelete(id: string) {
    if (!confirm("Ștergi acest contract generat? Fișierul se șterge definitiv.")) return;
    startTransition(async () => {
      const result = await stergeContractGeneratAction(id);
      setMessage(result.message ?? (result.success ? "Șters." : "Eroare."));
    });
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-heading text-text-primary">Contracte generate</h1>
      <p className="mb-4 text-xs text-text-secondary">Istoricul contractelor generate automat din oferte acceptate.</p>

      {message && (
        <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-300">
          {message}
        </div>
      )}

      {randuri.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-6 text-center text-sm text-text-secondary">
          Niciun contract generat încă.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-1 text-left text-xs font-medium text-text-secondary">
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Partener</th>
                <th className="px-3 py-2">Tip contract</th>
                <th className="px-3 py-2">Draft folosit</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Observații validare</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {randuri.map((r) => (
                <tr key={r.contract.id} className="border-b border-border-faint hover:bg-surface-1">
                  <td className="px-3 py-2 text-text-secondary">{r.contract.created_at.slice(0, 10)}</td>
                  <td className="px-3 py-2 font-medium text-text-primary">{numeAfisat(r.contract.partner_id)}</td>
                  <td className="px-3 py-2 text-text-secondary">{r.tipNume ?? "—"}</td>
                  <td className="px-3 py-2 text-text-secondary">{r.draftNume ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-text-primary">
                      {STATUS_CONTRACT_LABELS[r.contract.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-secondary">{r.contract.note_validare ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {r.downloadUrl && (
                        <a
                          href={r.downloadUrl}
                          download
                          className="rounded-md p-1 text-text-secondary hover:bg-[#E8007A]/15 hover:text-[#E8007A]"
                          title="Descarcă documentul"
                        >
                          <Download size={14} />
                        </a>
                      )}
                      <button
                        onClick={() => setEditand(r)}
                        className="rounded-md p-1 text-text-secondary hover:bg-[#E8007A]/15 hover:text-[#E8007A]"
                        title="Editează"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(r.contract.id)}
                        disabled={isPending}
                        className="rounded-md p-1 text-text-secondary hover:bg-red-500/15 hover:text-red-400 disabled:opacity-50"
                        title="Șterge"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editand && (
        <EditModal
          rand={editand}
          parteneri={parteneri}
          onClose={() => setEditand(null)}
          onSaved={(msg) => {
            setMessage(msg);
            setEditand(null);
          }}
        />
      )}
    </div>
  );
}

function EditModal({
  rand,
  parteneri,
  onClose,
  onSaved,
}: {
  rand: Rand;
  parteneri: { id: string; nume: string; cod_fiscal: string | null }[];
  onClose: () => void;
  onSaved: (msg: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<StatusContractGenerat>(rand.contract.status);
  const [noteValidare, setNoteValidare] = useState(rand.contract.note_validare ?? "");
  const [partnerId, setPartnerId] = useState(rand.contract.partner_id ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileMessage, setFileMessage] = useState<string | null>(null);

  function handleSave() {
    startTransition(async () => {
      const result = await actualizeazaContractGeneratAction(rand.contract.id, {
        status,
        note_validare: noteValidare || null,
        partner_id: partnerId || null,
      });
      onSaved(result.message ?? (result.success ? "Salvat." : "Eroare."));
    });
  }

  function handleReplaceFile() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await inlocuiesteFisierContractGeneratAction(rand.contract.id, formData);
      setFileMessage(result.message);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border-subtle bg-surface-1 p-4">
        <h2 className="mb-3 text-sm font-medium text-text-primary">Editează contractul generat</h2>
        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Partener</label>
            <select
              value={partnerId}
              onChange={(e) => setPartnerId(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            >
              <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                — Fără —
              </option>
              {parteneri.map((p) => (
                <option key={p.id} value={p.id} style={{ backgroundColor: "var(--surface-1)" }}>
                  {p.nume}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusContractGenerat)}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            >
              {Object.entries(STATUS_CONTRACT_LABELS).map(([key, label]) => (
                <option key={key} value={key} style={{ backgroundColor: "var(--surface-1)" }}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Observații validare</label>
            <textarea
              value={noteValidare}
              onChange={(e) => setNoteValidare(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            />
          </div>

          <div className="border-t border-border-subtle pt-2.5">
            <label className="mb-1 block text-xs text-text-secondary">
              Înlocuiește fișierul (ex. dacă l-ai corectat manual în Word)
            </label>
            <div className="flex gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".docx"
                className="flex-1 rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
              />
              <button
                onClick={handleReplaceFile}
                disabled={isPending}
                className="flex items-center gap-1 rounded-md border border-border-subtle px-2.5 py-1.5 text-xs text-text-secondary hover:text-[#E8007A] disabled:opacity-50"
              >
                <Upload size={13} />
                Încarcă
              </button>
            </div>
            {fileMessage && <p className="mt-1 text-[11px] text-amber-300">{fileMessage}</p>}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-secondary">
            Închide
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] disabled:opacity-50"
          >
            {isPending ? "Se salvează..." : "Salvează"}
          </button>
        </div>
      </div>
    </div>
  );
}

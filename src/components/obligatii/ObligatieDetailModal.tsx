"use client";

import { useState, useTransition } from "react";
import { X, CheckCircle2, Undo2, Target } from "lucide-react";
import {
  updateObligatieTrackingAction,
  marcheazaPlatitAction,
  undoPlataAction,
} from "@/lib/actions/obligatii";
import { formatRon } from "@/lib/format";
import { getTodayISO } from "@/lib/date";
import { getZileDepasireObligatie, getObligatieStatus } from "@/lib/obligatii-analytics";
import type { Obligatie, ObligatiePlata, TipAchizitie } from "@/types/obligatii";

const TIP_ACHIZITIE_OPTIONS: TipAchizitie[] = ["Recurente", "Nerecurente"];

export function ObligatieDetailModal({
  obligatie,
  plati,
  onClose,
}: {
  obligatie: Obligatie;
  plati: ObligatiePlata[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [tipAchizitie, setTipAchizitie] = useState<TipAchizitie | "">(
    obligatie.tip_achizitie ?? ""
  );
  const [modalitatePlata, setModalitatePlata] = useState(obligatie.modalitate_plata ?? "");
  const [observatii, setObservatii] = useState(obligatie.observatii ?? "");
  const [valoarePropusa, setValoarePropusa] = useState(
    String(obligatie.valoare_propusa_spre_plata ?? obligatie.sold)
  );

  const [valoarePlata, setValoarePlata] = useState(String(obligatie.sold));
  const [dataPlata, setDataPlata] = useState(getTodayISO());

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const zileDepasire = getZileDepasireObligatie(obligatie);
  const status = getObligatieStatus(obligatie);

  function handleSaveTracking() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateObligatieTrackingAction(obligatie.id, {
        tip_achizitie: tipAchizitie === "" ? null : tipAchizitie,
        modalitate_plata: modalitatePlata || null,
        observatii: observatii || null,
        ...(obligatie.propus_spre_plata
          ? { valoare_propusa_spre_plata: Number(valoarePropusa) }
          : {}),
      });
      setMessage(
        result.success
          ? { type: "success", text: "Salvat." }
          : { type: "error", text: result.message ?? "Eroare la salvare." }
      );
    });
  }

  function handleMarcheazaPlatit() {
    setMessage(null);
    const valoare = Number(valoarePlata);
    startTransition(async () => {
      const result = await marcheazaPlatitAction(obligatie.id, { valoare, dataPlata });
      setMessage(
        result.success
          ? { type: "success", text: "Plata inregistrata." }
          : { type: "error", text: result.message ?? "Eroare." }
      );
    });
  }

  function handleUndo(plataId: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await undoPlataAction(plataId);
      setMessage(
        result.success
          ? { type: "success", text: "Plata anulata." }
          : { type: "error", text: result.message ?? "Eroare." }
      );
    });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border-subtle bg-surface-1 p-5"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs text-text-muted">Factura {obligatie.nr_factura}</p>
            <h2 className="text-lg font-heading text-text-primary">{obligatie.nume_furnizor}</h2>
            <p className="text-xs text-text-muted">{obligatie.serviciu_facturat ?? "—"}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-border-subtle bg-surface-1 p-3 text-sm">
          <div>
            <p className="text-[11px] text-text-muted">Total factura</p>
            <p className="font-mono text-text-primary">{formatRon(obligatie.total_factura)}</p>
          </div>
          <div>
            <p className="text-[11px] text-text-muted">Sold</p>
            <p className="font-mono text-text-primary">{formatRon(obligatie.sold)}</p>
          </div>
          <div>
            <p className="text-[11px] text-text-muted">Scadenta</p>
            <p className="text-text-primary">
              {obligatie.data_scadenta
                ? new Date(obligatie.data_scadenta).toLocaleDateString("ro-RO")
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-text-muted">Status</p>
            <p className="text-text-primary">
              {status === "platita"
                ? "Platita"
                : status === "restanta"
                  ? `Restanta (${zileDepasire} zile)`
                  : "La zi"}
            </p>
          </div>
        </div>

        {plati.length > 0 && (
          <div className="mb-4">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
              Jurnal plati
            </p>
            <div className="space-y-1.5">
              {plati.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-md border border-border-subtle bg-surface-1 px-2.5 py-1.5 text-sm"
                >
                  <div>
                    <span className="font-mono text-text-primary">{formatRon(p.valoare)}</span>
                    <span className="ml-2 text-xs text-text-muted">
                      {new Date(p.data_plata).toLocaleDateString("ro-RO")}
                      {p.observatie ? ` · ${p.observatie}` : ""}
                    </span>
                  </div>
                  <button
                    onClick={() => handleUndo(p.id)}
                    disabled={isPending}
                    title="Anuleaza aceasta plata"
                    className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    <Undo2 size={12} />
                    Anuleaza
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {obligatie.propus_spre_plata && obligatie.sold > 0 && (
          <div className="mb-4 rounded-lg border border-[#E8007A]/20 bg-[#E8007A]/5 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#E8007A]">
              <Target size={13} />
              Valoare propusa spre plata
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="mb-1 block text-[11px] text-text-muted">
                  Valoare (lei) — sold factura: {formatRon(obligatie.sold)}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={obligatie.sold}
                  value={valoarePropusa}
                  onChange={(e) => setValoarePropusa(e.target.value)}
                  className="w-40 rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
                />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-text-muted">
              Implicit se propune soldul integral. Poti reduce valoarea daca platesti doar o
              parte in perioada curenta. Salveaza mai jos ca sa aplici modificarea.
            </p>
          </div>
        )}

        {obligatie.sold > 0 && (
          <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/5 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-green-400">
              <CheckCircle2 size={13} />
              Marcheaza platit
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="mb-1 block text-[11px] text-text-muted">Valoare (lei)</label>
                <input
                  type="number"
                  value={valoarePlata}
                  onChange={(e) => setValoarePlata(e.target.value)}
                  className="w-32 rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-text-muted">Data</label>
                <input
                  type="date"
                  value={dataPlata}
                  onChange={(e) => setDataPlata(e.target.value)}
                  className="rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary outline-none focus:border-green-500"
                />
              </div>
              <button
                onClick={handleMarcheazaPlatit}
                disabled={isPending}
                className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-text-primary transition hover:bg-green-500 disabled:opacity-50"
              >
                Confirma
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] text-text-muted">Tip achizitie</label>
            <select
              value={tipAchizitie}
              onChange={(e) => setTipAchizitie(e.target.value as TipAchizitie | "")}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2.5 py-2 text-sm text-text-primary outline-none focus:border-[#E8007A]"
            >
              <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                —
              </option>
              {TIP_ACHIZITIE_OPTIONS.map((o) => (
                <option key={o} value={o} style={{ backgroundColor: "var(--surface-1)" }}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-text-muted">Modalitate plata</label>
            <input
              value={modalitatePlata}
              onChange={(e) => setModalitatePlata(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2.5 py-2 text-sm text-text-primary outline-none focus:border-[#E8007A]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-text-muted">Observatii</label>
            <textarea
              value={observatii}
              onChange={(e) => setObservatii(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2.5 py-2 text-sm text-text-primary outline-none focus:border-[#E8007A]"
            />
          </div>
        </div>

        {message && (
          <p
            className={`mt-3 text-xs ${message.type === "success" ? "text-green-400" : "text-red-400"}`}
          >
            {message.text}
          </p>
        )}

        <button
          onClick={handleSaveTracking}
          disabled={isPending}
          className="mt-4 w-full rounded-md bg-[#E8007A] py-2 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
        >
          {isPending ? "Se salveaza..." : "Salveaza"}
        </button>
      </div>
    </div>
  );
}

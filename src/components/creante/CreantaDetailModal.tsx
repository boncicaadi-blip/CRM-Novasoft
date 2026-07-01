"use client";

import { useState, useTransition } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { updateCreantaTrackingAction, marcheazaIncasatAction } from "@/lib/actions/creante";
import { formatEur } from "@/lib/format";
import { getZileDepasire, getCreantaStatus } from "@/lib/creante-analytics";
import type { Creanta, ComportamentPlata } from "@/types/creante";

const COMPORTAMENT_OPTIONS: ComportamentPlata[] = ["Bun platnic", "Platnic mediu", "Rau platnic"];

export function CreantaDetailModal({
  creanta,
  onClose,
}: {
  creanta: Creanta;
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [comportament, setComportament] = useState<ComportamentPlata | "">(
    creanta.comportament_plata ?? ""
  );
  const [gradDificultate, setGradDificultate] = useState(creanta.grad_dificultate_incasare ?? "");
  const [dataTinta, setDataTinta] = useState(creanta.data_tinta_incasare ?? "");
  const [observatii, setObservatii] = useState(creanta.observatii ?? "");
  const [datorieOp, setDatorieOp] = useState(creanta.datorie_operationala);
  const [departament, setDepartament] = useState(creanta.departament_datorie_operationala ?? "");

  const [valoareIncasare, setValoareIncasare] = useState(String(creanta.sold));
  const [dataIncasare, setDataIncasare] = useState(new Date().toISOString().slice(0, 10));

  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const zileDepasire = getZileDepasire(creanta);
  const status = getCreantaStatus(creanta);

  function handleSaveTracking() {
    setMessage(null);
    startTransition(async () => {
      const result = await updateCreantaTrackingAction(creanta.id, {
        comportament_plata: comportament === "" ? null : comportament,
        grad_dificultate_incasare: gradDificultate || null,
        data_tinta_incasare: dataTinta || null,
        observatii: observatii || null,
        datorie_operationala: datorieOp,
        departament_datorie_operationala: datorieOp ? departament || null : null,
      });
      setMessage(
        result.success
          ? { type: "success", text: "Salvat." }
          : { type: "error", text: result.message ?? "Eroare la salvare." }
      );
    });
  }

  function handleMarcheazaIncasat() {
    setMessage(null);
    const valoare = Number(valoareIncasare);
    startTransition(async () => {
      const result = await marcheazaIncasatAction(creanta.id, { valoare, dataIncasare });
      if (result.success) {
        setMessage({ type: "success", text: "Incasare inregistrata." });
      } else {
        setMessage({ type: "error", text: result.message ?? "Eroare." });
      }
    });
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-white/10 bg-[#111535] p-5"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-500">Factura {creanta.nr_factura}</p>
            <h2 className="text-lg font-heading text-white">{creanta.nume_firma}</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3 text-sm">
          <div>
            <p className="text-[11px] text-slate-500">Total factura</p>
            <p className="font-mono text-white">{formatEur(creanta.total_factura)}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500">Sold</p>
            <p className="font-mono text-white">{formatEur(creanta.sold)}</p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500">Scadenta</p>
            <p className="text-white">
              {creanta.data_scadenta
                ? new Date(creanta.data_scadenta).toLocaleDateString("ro-RO")
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-slate-500">Status</p>
            <p className="text-white">
              {status === "incasata"
                ? "Incasata"
                : status === "restanta"
                  ? `Restanta (${zileDepasire} zile)`
                  : "La zi"}
            </p>
          </div>
        </div>

        {creanta.sold > 0 && (
          <div className="mb-4 rounded-lg border border-green-500/20 bg-green-500/5 p-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-green-400">
              <CheckCircle2 size={13} />
              Marcheaza incasat
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="mb-1 block text-[11px] text-slate-500">Valoare (EUR)</label>
                <input
                  type="number"
                  value={valoareIncasare}
                  onChange={(e) => setValoareIncasare(e.target.value)}
                  className="w-32 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-slate-500">Data</label>
                <input
                  type="date"
                  value={dataIncasare}
                  onChange={(e) => setDataIncasare(e.target.value)}
                  className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-green-500"
                />
              </div>
              <button
                onClick={handleMarcheazaIncasat}
                disabled={isPending}
                className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-green-500 disabled:opacity-50"
              >
                Confirma
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] text-slate-500">Comportament de plata</label>
            <select
              value={comportament}
              onChange={(e) => setComportament(e.target.value as ComportamentPlata | "")}
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
            >
              <option value="">—</option>
              {COMPORTAMENT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-slate-500">Grad dificultate incasare</label>
            <input
              value={gradDificultate}
              onChange={(e) => setGradDificultate(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] text-slate-500">
              Data tinta de incasare
            </label>
            <input
              type="date"
              value={dataTinta}
              onChange={(e) => setDataTinta(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
            />
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

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="datorie-op"
              checked={datorieOp}
              onChange={(e) => setDatorieOp(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/[0.04]"
            />
            <label htmlFor="datorie-op" className="text-sm text-slate-300">
              Datorie operationala
            </label>
          </div>

          {datorieOp && (
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">Departament</label>
              <input
                value={departament}
                onChange={(e) => setDepartament(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
              />
            </div>
          )}
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

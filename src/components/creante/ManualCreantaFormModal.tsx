"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { addCreantaManualAction } from "@/lib/actions/creante";
import { getTodayISO } from "@/lib/date";
import type { TipVanzare } from "@/types/creante";

const inputClass =
  "w-full rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-2 text-sm text-white outline-none focus:border-[#E8007A]";
const labelClass = "mb-1 block text-[11px] text-slate-500";

export function ManualCreantaFormModal({ onClose }: { onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [nrFactura, setNrFactura] = useState("");
  const [numeFirma, setNumeFirma] = useState("");
  const [dataFactura, setDataFactura] = useState(getTodayISO());
  const [dataScadenta, setDataScadenta] = useState("");
  const [totalFactura, setTotalFactura] = useState("");
  const [produs, setProdus] = useState("");
  const [serviciu, setServiciu] = useState("");
  const [tipVanzare, setTipVanzare] = useState<TipVanzare | "">("");
  const [termenIncasare, setTermenIncasare] = useState("");
  const [observatii, setObservatii] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function handleSave() {
    setMessage(null);
    if (!nrFactura.trim() || !numeFirma.trim() || !totalFactura) {
      setMessage("Nr. factura, Client si Total factura sunt obligatorii.");
      return;
    }
    startTransition(async () => {
      const result = await addCreantaManualAction({
        nr_factura: nrFactura,
        nume_firma: numeFirma,
        data_factura: dataFactura || null,
        data_scadenta: dataScadenta || null,
        total_factura: Number(totalFactura),
        produs: produs || null,
        serviciu_facturat: serviciu || null,
        tip_vanzare: tipVanzare || null,
        termen_incasare_zile: termenIncasare ? Number(termenIncasare) : null,
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
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-white/10 bg-[#111535] p-5"
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-heading text-white">Adauga factura manual</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Nr. factura *</label>
              <input value={nrFactura} onChange={(e) => setNrFactura(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Total factura (RON) *</label>
              <input
                type="number"
                step="0.01"
                value={totalFactura}
                onChange={(e) => setTotalFactura(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Client *</label>
            <input value={numeFirma} onChange={(e) => setNumeFirma(e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Data factura</label>
              <input
                type="date"
                value={dataFactura}
                onChange={(e) => setDataFactura(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Scadenta</label>
              <input
                type="date"
                value={dataScadenta}
                onChange={(e) => setDataScadenta(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Produs</label>
              <input value={produs} onChange={(e) => setProdus(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Serviciu</label>
              <input value={serviciu} onChange={(e) => setServiciu(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Tip vanzare</label>
              <select
                value={tipVanzare}
                onChange={(e) => setTipVanzare(e.target.value as TipVanzare | "")}
                className={inputClass}
              >
                <option value="" style={{ backgroundColor: "#111535" }}>
                  Necunoscut
                </option>
                <option value="Recurente" style={{ backgroundColor: "#111535" }}>
                  Recurente
                </option>
                <option value="Nerecurente" style={{ backgroundColor: "#111535" }}>
                  Nerecurente
                </option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Termen incasare (zile)</label>
              <input
                type="number"
                value={termenIncasare}
                onChange={(e) => setTermenIncasare(e.target.value)}
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

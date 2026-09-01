"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { addObligatieManualAction } from "@/lib/actions/obligatii";
import { getCursValutarAction } from "@/lib/actions/bnr";
import { getTodayISO } from "@/lib/date";
import type { TipAchizitie } from "@/types/obligatii";
import type { FurnizorOption } from "@/lib/data/partners";

const inputClass =
  "w-full rounded-md border border-border-subtle bg-surface-2 px-2.5 py-2 text-sm text-text-primary outline-none focus:border-[#E8007A]";
const labelClass = "mb-1 block text-[11px] text-text-muted";

const MONEDE = ["RON", "EUR", "USD"];

export function ManualObligatieFormModal({
  modalitatePlataOptions,
  furnizoriOptions,
  onClose,
}: {
  modalitatePlataOptions: string[];
  furnizoriOptions: FurnizorOption[];
  onClose: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [isFetchingCurs, startFetchingCurs] = useTransition();
  const [partnerId, setPartnerId] = useState("");
  const [nrFactura, setNrFactura] = useState("");
  const [numeFurnizor, setNumeFurnizor] = useState("");
  const [cifFurnizor, setCifFurnizor] = useState("");
  const [dataFactura, setDataFactura] = useState(getTodayISO());
  const [dataScadenta, setDataScadenta] = useState("");
  const [serviciu, setServiciu] = useState("");
  const [tipAchizitie, setTipAchizitie] = useState<TipAchizitie | "">("");
  const [modalitatePlata, setModalitatePlata] = useState("");
  const [moneda, setMoneda] = useState("RON");
  const [valoareValuta, setValoareValuta] = useState("");
  const [cursValutar, setCursValutar] = useState("");
  const [totalFactura, setTotalFactura] = useState("");
  const [observatii, setObservatii] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const esteValutaStraina = moneda !== "RON";

  function handlePreiaCurs() {
    if (!dataFactura) {
      setMessage("Completeaza data facturii intai.");
      return;
    }
    setMessage(null);
    startFetchingCurs(async () => {
      const result = await getCursValutarAction(dataFactura, moneda);
      if (result.success && result.curs) {
        setCursValutar(String(result.curs));
        if (valoareValuta) {
          setTotalFactura((Number(valoareValuta) * result.curs).toFixed(2));
        }
        if (result.dataCurs !== dataFactura) {
          setMessage(`Curs BNR preluat din ${result.dataCurs} (cea mai apropiata zi cu curs publicat).`);
        }
      } else {
        setMessage(result.message ?? "Nu am putut prelua cursul BNR.");
      }
    });
  }

  function handleValoareValutaChange(value: string) {
    setValoareValuta(value);
    if (cursValutar && value) {
      setTotalFactura((Number(value) * Number(cursValutar)).toFixed(2));
    }
  }

  function handleSave() {
    setMessage(null);
    if (!nrFactura.trim() || !numeFurnizor.trim() || !totalFactura) {
      setMessage("Nr. factura, Furnizor si Total factura sunt obligatorii.");
      return;
    }
    if (esteValutaStraina && (!valoareValuta || !cursValutar)) {
      setMessage("Pentru facturi in valuta, completeaza valoarea originala si cursul (sau apasa Preia curs BNR).");
      return;
    }
    startTransition(async () => {
      const result = await addObligatieManualAction({
        nr_factura: nrFactura,
        nume_furnizor: numeFurnizor,
        cif_furnizor: cifFurnizor || null,
        partner_id: partnerId || null,
        data_factura: dataFactura || null,
        data_scadenta: dataScadenta || null,
        serviciu_facturat: serviciu || null,
        tip_achizitie: tipAchizitie || null,
        modalitate_plata: modalitatePlata || null,
        total_factura: Number(totalFactura),
        moneda,
        valoare_valuta: esteValutaStraina ? Number(valoareValuta) : null,
        curs_valutar: esteValutaStraina ? Number(cursValutar) : null,
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
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border-subtle bg-surface-1 p-5"
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-heading text-text-primary">Adauga factura manual</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          {furnizoriOptions.length > 0 && (
            <div>
              <label className={labelClass}>Alege din parteneri existenti (optional)</label>
              <select
                value={partnerId}
                onChange={(e) => {
                  const id = e.target.value;
                  setPartnerId(id);
                  const furnizor = furnizoriOptions.find((f) => f.id === id);
                  if (furnizor) {
                    setNumeFurnizor(furnizor.nume);
                    setCifFurnizor(furnizor.cod_fiscal ?? "");
                  }
                }}
                className={inputClass}
              >
                <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                  — factura noua (furnizor nou) —
                </option>
                {furnizoriOptions.map((f) => (
                  <option key={f.id} value={f.id} style={{ backgroundColor: "var(--surface-1)" }}>
                    {f.nume}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-text-faint">
                Lista vine din Setari → Parteneri (bifa &quot;Furnizor&quot;). Poti completa si manual mai jos, pentru
                furnizori noi.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Nr. factura *</label>
              <input value={nrFactura} onChange={(e) => setNrFactura(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Furnizor *</label>
              <input
                value={numeFurnizor}
                onChange={(e) => {
                  setNumeFurnizor(e.target.value);
                  setPartnerId("");
                }}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>CIF furnizor</label>
            <input value={cifFurnizor} onChange={(e) => setCifFurnizor(e.target.value)} className={inputClass} />
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

          <div>
            <label className={labelClass}>Moneda</label>
            <select value={moneda} onChange={(e) => setMoneda(e.target.value)} className={inputClass}>
              {MONEDE.map((m) => (
                <option key={m} value={m} style={{ backgroundColor: "var(--surface-1)" }}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {esteValutaStraina && (
            <div className="rounded-md border border-border-subtle bg-surface-2 p-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Valoare in {moneda} *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={valoareValuta}
                    onChange={(e) => handleValoareValutaChange(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Curs BNR ({moneda}/RON) *</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      step="0.0001"
                      value={cursValutar}
                      onChange={(e) => {
                        setCursValutar(e.target.value);
                        if (valoareValuta && e.target.value) {
                          setTotalFactura((Number(valoareValuta) * Number(e.target.value)).toFixed(2));
                        }
                      }}
                      className={inputClass}
                    />
                    <button
                      type="button"
                      onClick={handlePreiaCurs}
                      disabled={isFetchingCurs}
                      title="Preia automat cursul BNR din data facturii"
                      className="shrink-0 rounded-md border border-border-subtle px-2 text-xs text-text-secondary hover:border-border-strong hover:text-text-primary disabled:opacity-50"
                    >
                      {isFetchingCurs ? "..." : "BNR"}
                    </button>
                  </div>
                </div>
              </div>
              <p className="mt-1.5 text-[10px] text-text-faint">
                Totalul in RON de mai jos se calculeaza automat (Valoare × Curs) - il poti suprascrie manual.
              </p>
            </div>
          )}

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

          <div>
            <label className={labelClass}>Serviciu</label>
            <input value={serviciu} onChange={(e) => setServiciu(e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Tip achizitie</label>
              <select
                value={tipAchizitie}
                onChange={(e) => setTipAchizitie(e.target.value as TipAchizitie | "")}
                className={inputClass}
              >
                <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                  Necunoscut
                </option>
                <option value="Recurente" style={{ backgroundColor: "var(--surface-1)" }}>
                  Recurente
                </option>
                <option value="Nerecurente" style={{ backgroundColor: "var(--surface-1)" }}>
                  Nerecurente
                </option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Modalitate plata</label>
              <select value={modalitatePlata} onChange={(e) => setModalitatePlata(e.target.value)} className={inputClass}>
                <option value="" style={{ backgroundColor: "var(--surface-1)" }}>
                  —
                </option>
                {modalitatePlataOptions.map((o) => (
                  <option key={o} value={o} style={{ backgroundColor: "var(--surface-1)" }}>
                    {o}
                  </option>
                ))}
              </select>
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

        {message && <p className="mt-3 text-xs text-amber-400">{message}</p>}

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

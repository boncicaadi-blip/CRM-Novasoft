"use client";

import { useState, useTransition } from "react";
import { FileText, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import {
  getDateNotificareGrupAction,
  genereazaNotificarePlataAction,
  type GrupNotificare,
  type DateNotificareGrup,
  type FacturaNotificarePreview,
} from "@/lib/actions/notificare-plata";

function formatSuma(v: number): string {
  return new Intl.NumberFormat("ro-RO", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v) + " RON";
}

function descarcaBase64(base64: string, numeFisier: string) {
  const byteChars = atob(base64);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = numeFisier;
  a.click();
  URL.revokeObjectURL(url);
}

type Selectie = { tip: "grup" | "firma"; valoare: string; afisaj: string };

export function NotificarePlataClient({ grupuri }: { grupuri: GrupNotificare[] }) {
  const [expandat, setExpandat] = useState<Set<string>>(new Set());
  const [selectie, setSelectie] = useState<Selectie | null>(null);
  const [detalii, setDetalii] = useState<DateNotificareGrup | null>(null);
  const [isLoadingDetalii, startLoadingDetalii] = useTransition();
  const [isGenerating, startGenerating] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [bifateRestante, setBifateRestante] = useState<Set<string>>(new Set());
  const [bifateUrmatoare, setBifateUrmatoare] = useState<Set<string>>(new Set());

  function toggleExpandat(label: string) {
    setExpandat((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  }

  function handleSelect(sel: Selectie) {
    setSelectie(sel);
    setDetalii(null);
    setMessage(null);
    startLoadingDetalii(async () => {
      const result = await getDateNotificareGrupAction({ tip: sel.tip, valoare: sel.valoare });
      setDetalii(result);
      setBifateRestante(new Set(result.facturiRestante.map((f) => f.nr_factura)));
      setBifateUrmatoare(new Set(result.facturiUrmatoare.map((f) => f.nr_factura)));
    });
  }

  function toggleFactura(tip: "restante" | "urmatoare", nrFactura: string) {
    const setter = tip === "restante" ? setBifateRestante : setBifateUrmatoare;
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(nrFactura)) next.delete(nrFactura);
      else next.add(nrFactura);
      return next;
    });
  }

  const soldSelectat =
    (detalii?.facturiRestante.filter((f) => bifateRestante.has(f.nr_factura)).reduce((s, f) => s + f.sold, 0) ?? 0) +
    (detalii?.facturiUrmatoare.filter((f) => bifateUrmatoare.has(f.nr_factura)).reduce((s, f) => s + f.sold, 0) ?? 0);

  function handleGenerate() {
    if (!selectie || !detalii) return;
    setMessage(null);

    const restanteSelectate: FacturaNotificarePreview[] = detalii.facturiRestante.filter((f) =>
      bifateRestante.has(f.nr_factura)
    );
    const urmatoareSelectate: FacturaNotificarePreview[] = detalii.facturiUrmatoare.filter((f) =>
      bifateUrmatoare.has(f.nr_factura)
    );

    startGenerating(async () => {
      const result = await genereazaNotificarePlataAction(selectie.afisaj, restanteSelectate, urmatoareSelectate);
      if (result.success && result.base64 && result.numeFisier) {
        descarcaBase64(result.base64, result.numeFisier);
        setMessage("PDF generat si descarcat.");
      } else {
        setMessage(result.message ?? "Eroare la generare.");
      }
    });
  }

  return (
    <div>
      <h1 className="mb-1 text-lg font-heading text-text-primary">Notificare de plata</h1>
      <p className="mb-4 text-xs text-text-secondary">
        Alege un grup, o societate individuala, sau extinde un grup ca sa alegi doar o firma din el. Poti debifa
        orice factura nu vrei sa apara in notificare.
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-border-subtle">
          <div className="border-b border-border-subtle bg-surface-1 px-3 py-2 text-xs font-medium text-text-secondary">
            Clienti cu sold neincasat ({grupuri.length})
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            {grupuri.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-text-secondary">Niciun sold neincasat momentan.</p>
            )}
            {grupuri.map((g) => (
              <div key={g.label} className="border-b border-border-faint">
                <div
                  className={`flex w-full items-center gap-1.5 px-3 py-2.5 text-left text-sm transition hover:bg-surface-1 ${
                    selectie?.tip === "grup" && selectie.valoare === g.label ? "bg-[#E8007A]/10" : ""
                  }`}
                >
                  {g.esteGrup && (
                    <button onClick={() => toggleExpandat(g.label)} className="shrink-0 text-text-secondary">
                      {expandat.has(g.label) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  )}
                  <button
                    onClick={() => handleSelect({ tip: "grup", valoare: g.label, afisaj: g.label })}
                    className="flex min-w-0 flex-1 items-center justify-between"
                  >
                    <span className="min-w-0 flex-1 truncate text-text-primary">
                      {g.label} {g.esteGrup && <span className="text-[10px] text-text-secondary">(grup)</span>}
                    </span>
                    <span className="ml-2 shrink-0 text-right">
                      <span className="block font-mono text-xs text-text-primary">{formatSuma(g.soldTotal)}</span>
                      {g.nrFacturiRestante > 0 && (
                        <span className="flex items-center justify-end gap-1 text-[10px] text-red-400">
                          <AlertTriangle size={9} />
                          {g.nrFacturiRestante} restante
                        </span>
                      )}
                    </span>
                  </button>
                </div>
                {g.esteGrup && expandat.has(g.label) && (
                  <div className="bg-surface-1/50">
                    {g.membri.map((m) => (
                      <button
                        key={m.nume}
                        onClick={() => handleSelect({ tip: "firma", valoare: m.nume, afisaj: m.nume })}
                        className={`flex w-full items-center justify-between py-1.5 pl-8 pr-3 text-left text-xs transition hover:bg-surface-1 ${
                          selectie?.tip === "firma" && selectie.valoare === m.nume ? "bg-[#E8007A]/10" : ""
                        }`}
                      >
                        <span className="min-w-0 flex-1 truncate text-text-secondary">{m.nume}</span>
                        <span className="ml-2 shrink-0 font-mono text-text-secondary">{formatSuma(m.soldTotal)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          {!selectie && (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-border-subtle bg-surface-1 text-sm text-text-secondary">
              Alege un client din lista, ca sa vezi previzualizarea.
            </div>
          )}

          {selectie && isLoadingDetalii && (
            <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-border-subtle bg-surface-1 text-sm text-text-secondary">
              Se incarca...
            </div>
          )}

          {selectie && detalii && !isLoadingDetalii && (
            <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">{selectie.afisaj}</p>
                  <p className="text-xs text-text-secondary">
                    Sold selectat: <span className="font-mono text-text-primary">{formatSuma(soldSelectat)}</span>
                    {soldSelectat !== detalii.soldTotal && (
                      <span className="text-text-faint"> (din total {formatSuma(detalii.soldTotal)})</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || (bifateRestante.size === 0 && bifateUrmatoare.size === 0)}
                  className="flex items-center gap-1.5 rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
                >
                  <FileText size={14} />
                  {isGenerating ? "Se genereaza..." : "Genereaza PDF"}
                </button>
              </div>

              {message && (
                <div className="mb-3 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300">
                  {message}
                </div>
              )}

              {detalii.facturiRestante.length > 0 && (
                <div className="mb-4">
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-red-400">
                    Facturi cu scadenta depasita ({detalii.facturiRestante.length})
                  </p>
                  <div className="overflow-x-auto rounded-md border border-border-subtle">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border-subtle bg-surface-2 text-left text-text-secondary">
                          <th className="w-6 px-2 py-1.5"></th>
                          <th className="px-2 py-1.5">Factura</th>
                          <th className="px-2 py-1.5">Scadenta</th>
                          <th className="px-2 py-1.5 text-right">Sold</th>
                          <th className="px-2 py-1.5 text-right">Intarziere</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalii.facturiRestante.map((f) => (
                          <tr key={f.nr_factura} className="border-b border-border-faint">
                            <td className="px-2 py-1">
                              <input
                                type="checkbox"
                                checked={bifateRestante.has(f.nr_factura)}
                                onChange={() => toggleFactura("restante", f.nr_factura)}
                                className="accent-[#E8007A]"
                              />
                            </td>
                            <td className="px-2 py-1 text-text-primary">{f.nr_factura}</td>
                            <td className="px-2 py-1 text-text-secondary">{f.data_scadenta ?? "—"}</td>
                            <td className="px-2 py-1 text-right font-mono text-text-primary">{formatSuma(f.sold)}</td>
                            <td className="px-2 py-1 text-right text-red-400">{f.zile_intarziere} zile</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {detalii.facturiUrmatoare.length > 0 && (
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-text-secondary">
                    Facturi cu scadenta urmatoare ({detalii.facturiUrmatoare.length})
                  </p>
                  <div className="overflow-x-auto rounded-md border border-border-subtle">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border-subtle bg-surface-2 text-left text-text-secondary">
                          <th className="w-6 px-2 py-1.5"></th>
                          <th className="px-2 py-1.5">Factura</th>
                          <th className="px-2 py-1.5">Scadenta</th>
                          <th className="px-2 py-1.5 text-right">Sold</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detalii.facturiUrmatoare.map((f) => (
                          <tr key={f.nr_factura} className="border-b border-border-faint">
                            <td className="px-2 py-1">
                              <input
                                type="checkbox"
                                checked={bifateUrmatoare.has(f.nr_factura)}
                                onChange={() => toggleFactura("urmatoare", f.nr_factura)}
                                className="accent-[#E8007A]"
                              />
                            </td>
                            <td className="px-2 py-1 text-text-primary">{f.nr_factura}</td>
                            <td className="px-2 py-1 text-text-secondary">{f.data_scadenta ?? "—"}</td>
                            <td className="px-2 py-1 text-right font-mono text-text-primary">{formatSuma(f.sold)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

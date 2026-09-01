"use client";

import { useState, useTransition } from "react";
import { CircleDollarSign, TrendingUp } from "lucide-react";
import { getCursValutarAction, getCursIstoricAnAction, getCursIstoricPerioadaAction, type CursIstoricRow } from "@/lib/actions/bnr";
import { getTodayISO } from "@/lib/date";

const MONEDE = ["EUR", "USD"];

export function BnrCursCard() {
  const [data, setData] = useState(getTodayISO());
  const [moneda, setMoneda] = useState("EUR");
  const [isPending, startTransition] = useTransition();
  const [rezultat, setRezultat] = useState<{ curs: number; dataCurs: string } | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);

  const [anIstoric, setAnIstoric] = useState(String(new Date().getFullYear()));
  const [monedaIstoric, setMonedaIstoric] = useState("EUR");
  const [isLoadingIstoric, startIstoric] = useTransition();
  const [istoric, setIstoric] = useState<CursIstoricRow[] | null>(null);
  const [eroareIstoric, setEroareIstoric] = useState<string | null>(null);

  const [dataStartPerioada, setDataStartPerioada] = useState("");
  const [dataEndPerioada, setDataEndPerioada] = useState(getTodayISO());
  const [monedaPerioada, setMonedaPerioada] = useState("EUR");
  const [isLoadingPerioada, startPerioada] = useTransition();
  const [istoricPerioada, setIstoricPerioada] = useState<CursIstoricRow[] | null>(null);
  const [eroarePerioada, setEroarePerioada] = useState<string | null>(null);

  function handleCauta() {
    setEroare(null);
    setRezultat(null);
    startTransition(async () => {
      const result = await getCursValutarAction(data, moneda);
      if (result.success && result.curs) {
        setRezultat({ curs: result.curs, dataCurs: result.dataCurs ?? data });
      } else {
        setEroare(result.message ?? "Nu am gasit curs pentru data/moneda aleasa.");
      }
    });
  }

  function handleAfiseazaIstoric() {
    setEroareIstoric(null);
    setIstoric(null);
    startIstoric(async () => {
      const result = await getCursIstoricAnAction(monedaIstoric, Number(anIstoric));
      if (result.success) {
        setIstoric(result.rows ?? []);
      } else {
        setEroareIstoric(result.message ?? "Nu am putut prelua istoricul.");
      }
    });
  }

  function handleVerificaPerioada() {
    if (!dataStartPerioada || !dataEndPerioada) return;
    setEroarePerioada(null);
    setIstoricPerioada(null);
    startPerioada(async () => {
      const result = await getCursIstoricPerioadaAction(monedaPerioada, dataStartPerioada, dataEndPerioada);
      if (result.success) {
        setIstoricPerioada(result.rows ?? []);
      } else {
        setEroarePerioada(result.message ?? "Nu am putut prelua cursul pentru interval.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <p className="mb-3 text-sm font-medium text-text-primary">BNR - curs valutar</p>
      <p className="mb-4 text-xs text-text-muted">
        Cursul oficial BNR, pentru orice data din istoric - folosit automat la introducerea manuala a facturilor
        in valuta (Obligatii). Se cacheaza local dupa prima cautare dintr-un an, ca sa nu mai fie nevoie de un nou
        apel catre BNR pentru alte date din acelasi an.
      </p>

      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1 block text-[11px] text-text-muted">Data</label>
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-text-muted">Moneda</label>
          <select
            value={moneda}
            onChange={(e) => setMoneda(e.target.value)}
            className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
          >
            {MONEDE.map((m) => (
              <option key={m} value={m} style={{ backgroundColor: "var(--surface-1)" }}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleCauta}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
        >
          <CircleDollarSign size={14} />
          {isPending ? "Se cauta..." : "Cauta curs"}
        </button>
      </div>

      {rezultat && (
        <div className="mb-4 rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-400">
          1 {moneda} = <span className="font-mono font-semibold">{rezultat.curs.toFixed(4)}</span> RON
          {rezultat.dataCurs !== data && (
            <span className="ml-2 text-xs text-text-muted">
              (curs din {rezultat.dataCurs} - cea mai apropiata zi cu curs publicat)
            </span>
          )}
        </div>
      )}
      {eroare && <p className="mb-4 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">{eroare}</p>}

      <div className="border-t border-border-subtle pt-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Curs istoric (an intreg)</p>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-[11px] text-text-muted">An</label>
            <input
              type="number"
              value={anIstoric}
              onChange={(e) => setAnIstoric(e.target.value)}
              className="w-24 rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-text-muted">Moneda</label>
            <select
              value={monedaIstoric}
              onChange={(e) => setMonedaIstoric(e.target.value)}
              className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
            >
              {MONEDE.map((m) => (
                <option key={m} value={m} style={{ backgroundColor: "var(--surface-1)" }}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAfiseazaIstoric}
            disabled={isLoadingIstoric}
            className="flex items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-secondary transition hover:border-border-strong hover:text-text-primary disabled:opacity-50"
          >
            <TrendingUp size={14} />
            {isLoadingIstoric ? "Se incarca..." : "Afiseaza istoric"}
          </button>
        </div>

        {eroareIstoric && <p className="mb-2 text-xs text-red-400">{eroareIstoric}</p>}

        {istoric && (
          <div className="max-h-72 overflow-y-auto rounded-md border border-border-subtle">
            {istoric.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-text-muted">
                Niciun curs gasit pentru {monedaIstoric} in {anIstoric}.
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface-2">
                  <tr>
                    <th className="px-3 py-1.5 text-left text-text-muted">Data</th>
                    <th className="px-3 py-1.5 text-right text-text-muted">Curs ({monedaIstoric}/RON)</th>
                  </tr>
                </thead>
                <tbody>
                  {istoric.map((r) => (
                    <tr key={r.data} className="border-t border-border-faint">
                      <td className="px-3 py-1 text-text-secondary">{r.data}</td>
                      <td className="px-3 py-1 text-right font-mono text-text-primary">{r.curs.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-border-subtle pt-3">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Verificare pe interval</p>
        <p className="mb-3 text-[11px] text-text-muted">
          Utila pentru verificari bulk (ex. de la o data pana in prezent) - reimprospateaza automat toti anii
          implicati in interval, apoi arata cursul pentru fiecare zi publicata.
        </p>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <div>
            <label className="mb-1 block text-[11px] text-text-muted">De la</label>
            <input
              type="date"
              value={dataStartPerioada}
              onChange={(e) => setDataStartPerioada(e.target.value)}
              className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-text-muted">Pana la</label>
            <input
              type="date"
              value={dataEndPerioada}
              onChange={(e) => setDataEndPerioada(e.target.value)}
              className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] text-text-muted">Moneda</label>
            <select
              value={monedaPerioada}
              onChange={(e) => setMonedaPerioada(e.target.value)}
              className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
            >
              {MONEDE.map((m) => (
                <option key={m} value={m} style={{ backgroundColor: "var(--surface-1)" }}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleVerificaPerioada}
            disabled={isLoadingPerioada || !dataStartPerioada || !dataEndPerioada}
            className="flex items-center gap-1.5 rounded-md border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-secondary transition hover:border-border-strong hover:text-text-primary disabled:opacity-50"
          >
            <TrendingUp size={14} />
            {isLoadingPerioada ? "Se verifica..." : "Verifica intervalul"}
          </button>
        </div>

        {eroarePerioada && <p className="mb-2 text-xs text-red-400">{eroarePerioada}</p>}

        {istoricPerioada && (
          <div className="max-h-72 overflow-y-auto rounded-md border border-border-subtle">
            {istoricPerioada.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-text-muted">
                Niciun curs gasit pentru {monedaPerioada} in intervalul ales.
              </p>
            ) : (
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface-2">
                  <tr>
                    <th className="px-3 py-1.5 text-left text-text-muted">Data</th>
                    <th className="px-3 py-1.5 text-right text-text-muted">Curs ({monedaPerioada}/RON)</th>
                  </tr>
                </thead>
                <tbody>
                  {istoricPerioada.map((r) => (
                    <tr key={r.data} className="border-t border-border-faint">
                      <td className="px-3 py-1 text-text-secondary">{r.data}</td>
                      <td className="px-3 py-1 text-right font-mono text-text-primary">{r.curs.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
        {istoricPerioada && istoricPerioada.length > 0 && (
          <p className="mt-2 text-[11px] text-text-muted">{istoricPerioada.length} zile cu curs publicat, gasite in interval.</p>
        )}
      </div>
    </div>
  );
}

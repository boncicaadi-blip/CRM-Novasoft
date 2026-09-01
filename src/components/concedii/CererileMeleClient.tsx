"use client";

import { MesajActiune } from "./MesajActiune";
import { useState, useTransition, useMemo } from "react";
import { Plus, Pencil } from "lucide-react";
import { submitCerereConcediuAction, editeazaCerereAction } from "@/lib/actions/concedii";
import { computeSoldCascadat, calculeazaZileLucratoare } from "@/lib/concedii-analytics";
import { TIP_CONCEDIU_LABELS, TIP_CONCEDIU_COLORS } from "@/types/concedii";
import type { Angajat, ConcediuCerere, ConcediuSold, TipConcediu } from "@/types/concedii";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  in_asteptare: { label: "In asteptare", color: "#FBBF24" },
  aprobat: { label: "Aprobat", color: "#22C55E" },
  respins: { label: "Respins", color: "#EF4444" },
};

export function CererileMeleClient({
  angajat,
  manager,
  cereri,
  toateCererileAnul,
  toateSolduri,
  anInceput,
  vizualizareAdmin = false,
}: {
  angajat: Angajat;
  manager: Angajat | null;
  cereri: ConcediuCerere[];
  toateCererileAnul: ConcediuCerere[];
  toateSolduri: ConcediuSold[];
  anInceput: number;
  vizualizareAdmin?: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [cerereDeEditat, setCerereDeEditat] = useState<ConcediuCerere | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const anCurent = new Date().getFullYear();

  const aniDisponibili = useMemo(() => {
    const ani = new Set(cereri.map((c) => Number(c.data_inceput.slice(0, 4))));
    ani.add(anCurent);
    return Array.from(ani).sort((a, b) => b - a);
  }, [cereri, anCurent]);
  const [anFiltru, setAnFiltru] = useState(anCurent);

  const cereriFiltrate = useMemo(
    () => cereri.filter((c) => c.data_inceput.slice(0, 4) === String(anFiltru)),
    [cereri, anFiltru]
  );

  // Soldul (reportate/alocate/folosite/ramase) urmeaza anul selectat sus,
  // nu ramane fixat pe anul curent - calculat in cascada, ca sa fie corect
  // indiferent ce an alegi.
  const sold = useMemo(
    () => computeSoldCascadat(angajat, toateCererileAnul, toateSolduri, anFiltru, Math.min(anInceput, anFiltru)),
    [angajat, toateCererileAnul, toateSolduri, anFiltru, anInceput]
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-heading text-text-primary">
            {vizualizareAdmin ? `Cererile lui ${angajat.nume}` : "Cererile mele"}
          </h1>
          <p className="text-xs text-text-secondary">
            {angajat.nume}
            {manager && ` · Manager: ${manager.nume}`}
            {vizualizareAdmin && " · vizualizare admin"}
          </p>
        </div>
        {!vizualizareAdmin && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA]"
          >
            <Plus size={14} />
            Cerere noua
          </button>
        )}
      </div>

      <MesajActiune message={message} />

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {sold.zileReportate > 0 && (
          <div className="rounded-xl border border-border-subtle bg-surface-1 p-3">
            <p className="text-[11px] text-text-secondary" title="Zile neconsumate din anul anterior, reportate">
              Reportate ({anFiltru - 1})
            </p>
            <p className="font-mono text-xl font-semibold text-amber-400">{sold.zileReportate}</p>
          </div>
        )}
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-3">
          <p className="text-[11px] text-text-secondary">Alocate ({anFiltru})</p>
          <p className="font-mono text-xl font-semibold text-text-primary">{sold.zileAlocate}</p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-3">
          <p className="text-[11px] text-text-secondary">Folosite</p>
          <p className="font-mono text-xl font-semibold text-text-primary">{sold.zileFolosite}</p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-3">
          <p className="text-[11px] text-text-secondary">Ramase</p>
          <p className={`font-mono text-xl font-semibold ${sold.zileRamase < 0 ? "text-red-400" : "text-[#22C55E]"}`}>
            {sold.zileRamase}
          </p>
        </div>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">Istoric cereri</p>
        <select
          value={anFiltru}
          onChange={(e) => setAnFiltru(Number(e.target.value))}
          className="rounded-md border border-border-subtle bg-surface-2 px-2 py-1 text-xs text-text-primary"
        >
          {aniDisponibili.map((a) => (
            <option key={a} value={a} style={{ backgroundColor: "var(--surface-1)" }}>
              {a}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border-subtle">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-1 text-left text-xs font-medium text-text-secondary">
              <th className="px-3 py-2">Tip</th>
              <th className="px-3 py-2">Interval</th>
              <th className="px-3 py-2 text-right">Zile</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Data cererii</th>
              <th className="px-3 py-2">Data raspunsului</th>
              <th className="px-3 py-2">Observatii</th>
              {!vizualizareAdmin && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {cereriFiltrate.length === 0 && (
              <tr>
                <td colSpan={vizualizareAdmin ? 7 : 8} className="px-3 py-6 text-center text-xs text-text-secondary">
                  Nicio cerere pentru {anFiltru}.
                </td>
              </tr>
            )}
            {cereriFiltrate.map((c) => {
              const st = STATUS_LABELS[c.status];
              return (
                <tr key={c.id} className="border-b border-border-faint">
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1.5 text-text-primary">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TIP_CONCEDIU_COLORS[c.tip] }} />
                      {TIP_CONCEDIU_LABELS[c.tip]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {c.data_inceput} → {c.data_sfarsit}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-text-primary">{c.nr_zile}</td>
                  <td className="px-3 py-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{ backgroundColor: `${st.color}22`, color: st.color }}
                    >
                      {st.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-secondary">{c.created_at.slice(0, 10)}</td>
                  <td className="px-3 py-2 text-text-secondary">{c.data_aprobare ? c.data_aprobare.slice(0, 10) : "—"}</td>
                  <td className="px-3 py-2 text-text-secondary">{c.observatii ?? "—"}</td>
                  {!vizualizareAdmin && (
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => setCerereDeEditat(c)}
                        className="rounded p-1 text-text-secondary hover:bg-surface-2 hover:text-[#E8007A]"
                        title="Editeaza cererea"
                      >
                        <Pencil size={13} />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {(showForm || cerereDeEditat) && (
        <CerereModal
          cerereExistenta={cerereDeEditat ?? undefined}
          onClose={() => {
            setShowForm(false);
            setCerereDeEditat(null);
          }}
          onSaved={(msg) => {
            setMessage(msg);
            setShowForm(false);
            setCerereDeEditat(null);
          }}
          isPending={isPending}
          startTransition={startTransition}
        />
      )}
    </div>
  );
}

function CerereModal({
  cerereExistenta,
  onClose,
  onSaved,
  isPending,
  startTransition,
}: {
  cerereExistenta?: ConcediuCerere;
  onClose: () => void;
  onSaved: (msg: string) => void;
  isPending: boolean;
  startTransition: (fn: () => Promise<void>) => void;
}) {
  const [tip, setTip] = useState<TipConcediu>(cerereExistenta?.tip ?? "concediu_odihna");
  const [dataInceput, setDataInceput] = useState(cerereExistenta?.data_inceput ?? "");
  const [dataSfarsit, setDataSfarsit] = useState(cerereExistenta?.data_sfarsit ?? "");
  const [observatii, setObservatii] = useState(cerereExistenta?.observatii ?? "");

  const nrZile = dataInceput && dataSfarsit ? calculeazaZileLucratoare(dataInceput, dataSfarsit) : 0;

  function handleSubmit() {
    if (!dataInceput || !dataSfarsit) return;
    startTransition(async () => {
      const payload = {
        tip,
        data_inceput: dataInceput,
        data_sfarsit: dataSfarsit,
        nr_zile: nrZile,
        observatii: observatii || null,
      };
      const result = cerereExistenta
        ? await editeazaCerereAction(cerereExistenta.id, payload)
        : await submitCerereConcediuAction(payload);
      onSaved(result.message);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border-subtle bg-surface-1 p-4">
        <h2 className="mb-3 text-sm font-medium text-text-primary">
          {cerereExistenta ? "Editeaza cererea" : "Cerere noua de concediu"}
        </h2>
        {cerereExistenta && (
          <p className="mb-3 text-xs text-amber-400">
            Modificarea reseteaza cererea la &quot;In asteptare&quot; si o retrimite spre aprobare.
          </p>
        )}
        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Tip</label>
            <select
              value={tip}
              onChange={(e) => setTip(e.target.value as TipConcediu)}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            >
              {(Object.keys(TIP_CONCEDIU_LABELS) as TipConcediu[]).map((t) => (
                <option key={t} value={t} style={{ backgroundColor: "var(--surface-1)" }}>
                  {TIP_CONCEDIU_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-text-secondary">De la</label>
              <input
                type="date"
                value={dataInceput}
                onChange={(e) => setDataInceput(e.target.value)}
                className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-text-secondary">Pana la</label>
              <input
                type="date"
                value={dataSfarsit}
                onChange={(e) => setDataSfarsit(e.target.value)}
                className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
              />
            </div>
          </div>
          {dataInceput && dataSfarsit && (
            <p className="text-xs text-text-secondary">
              {nrZile} zile lucratoare (calculat automat - exclude weekend si sarbatori legale)
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Observatii (optional)</label>
            <input
              value={observatii}
              onChange={(e) => setObservatii(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border-subtle px-3 py-1.5 text-sm text-text-secondary">
            Anuleaza
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending || !dataInceput || !dataSfarsit}
            className="rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] disabled:opacity-50"
          >
            {cerereExistenta ? "Salveaza si retrimite" : "Trimite cererea"}
          </button>
        </div>
      </div>
    </div>
  );
}

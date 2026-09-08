"use client";

import { MesajActiune } from "./MesajActiune";
import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink, Pencil, Check, X } from "lucide-react";
import { computeSoldCascadat, primulAnCuDate, esteRelevantInAnul } from "@/lib/concedii-analytics";
import { setSoldAction } from "@/lib/actions/concedii";
import type { Angajat, ConcediuCerere, ConcediuSold } from "@/types/concedii";

export function RaportConcediiClient({
  angajati,
  cereri,
  solduri,
  doarPropriileDate = false,
}: {
  angajati: Angajat[];
  cereri: ConcediuCerere[];
  solduri: ConcediuSold[];
  doarPropriileDate?: boolean;
}) {
  const aniDisponibili = useMemo(() => {
    const ani = new Set(cereri.map((c) => Number(c.data_inceput.slice(0, 4))));
    ani.add(new Date().getFullYear());
    return Array.from(ani).sort((a, b) => b - a);
  }, [cereri]);

  const [an, setAn] = useState(new Date().getFullYear());
  const [selectatId, setSelectatId] = useState<string | null>(null);
  const [editandId, setEditandId] = useState<string | null>(null);
  const [valoareEditare, setValoareEditare] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const angajatiRelevanti = useMemo(
    () => angajati.filter((a) => esteRelevantInAnul(a, an)),
    [angajati, an]
  );

  const solduriAnul = useMemo(() => {
    const anInceput = primulAnCuDate(cereri, solduri);
    return angajatiRelevanti.map((a) => ({
      angajat_id: a.id,
      ...computeSoldCascadat(a, cereri, solduri, an, anInceput),
    }));
  }, [angajatiRelevanti, cereri, solduri, an]);

  const reportateMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of solduriAnul) map.set(s.angajat_id, s.zileReportate);
    return map;
  }, [solduriAnul]);

  const randuri = solduriAnul.map((s) => ({ ...s, reportate: reportateMap.get(s.angajat_id) ?? 0 }));

  const totaluri = randuri.reduce(
    (acc, s) => ({
      alocate: acc.alocate + s.zileAlocate,
      reportate: acc.reportate + s.reportate,
      folosite: acc.folosite + s.zileFolosite,
      ramase: acc.ramase + s.zileRamase,
    }),
    { alocate: 0, reportate: 0, folosite: 0, ramase: 0 }
  );

  const selectat = selectatId ? randuri.find((r) => r.angajat_id === selectatId) : null;
  const angajatSelectat = selectatId ? angajati.find((a) => a.id === selectatId) : null;
  const cardData = selectat
    ? { alocate: selectat.zileAlocate, reportate: selectat.reportate, folosite: selectat.zileFolosite, ramase: selectat.zileRamase }
    : totaluri;

  function startEditare(angajatId: string, valoareCurenta: number) {
    setEditandId(angajatId);
    setValoareEditare(String(valoareCurenta));
  }

  function salveazaAlocate(angajatId: string) {
    const valoare = Number(valoareEditare);
    if (Number.isNaN(valoare) || valoare < 0) return;
    startTransition(async () => {
      const result = await setSoldAction(angajatId, an, valoare);
      setMessage(result.message);
      if (result.success) setEditandId(null);
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-heading text-text-primary">Raport Concedii</h1>
          <p className="text-xs text-text-secondary">
            {doarPropriileDate
              ? "Soldul tau de zile - alocate, reportate, folosite, ramase."
              : "Sold de zile pe angajat - alocate, reportate, folosite, ramase."}
            {!selectat && !doarPropriileDate && " Click pe un angajat pentru statistica lui individuala."}
          </p>
        </div>
        <select
          value={an}
          onChange={(e) => setAn(Number(e.target.value))}
          className="rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
        >
          {aniDisponibili.map((a) => (
            <option key={a} value={a} style={{ backgroundColor: "var(--surface-1)" }}>
              {a}
            </option>
          ))}
        </select>
      </div>

      <MesajActiune message={message} />

      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          {doarPropriileDate
            ? "Statistica ta"
            : angajatSelectat
              ? `Statistica: ${angajatSelectat.nume}`
              : `Total echipa (${randuri.length} angajati)`}
        </p>
        {angajatSelectat && (
          <div className="flex items-center gap-3">
            <Link
              href={`/concedii/cererile-mele?angajat=${angajatSelectat.id}`}
              className="flex items-center gap-1 text-xs text-[#E8007A] hover:underline"
            >
              Vezi cererile lui {angajatSelectat.nume.split(" ")[0]}
              <ExternalLink size={12} />
            </Link>
            <button onClick={() => setSelectatId(null)} className="text-xs text-text-secondary hover:text-text-primary">
              Inapoi la total echipa
            </button>
          </div>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-3">
          <p className="text-[11px] text-text-secondary">Reportate ({an - 1})</p>
          <p className="font-mono text-xl font-semibold text-amber-400">{cardData.reportate}</p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-3">
          <p className="text-[11px] text-text-secondary">Alocate ({an})</p>
          <p className="font-mono text-xl font-semibold text-text-primary">{cardData.alocate}</p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-3">
          <p className="text-[11px] text-text-secondary">Folosite</p>
          <p className="font-mono text-xl font-semibold text-text-primary">{cardData.folosite}</p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-3">
          <p className="text-[11px] text-text-secondary">Ramase</p>
          <p className={`font-mono text-xl font-semibold ${cardData.ramase < 0 ? "text-red-400" : "text-[#22C55E]"}`}>
            {cardData.ramase}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border-subtle">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-1 text-left text-xs font-medium text-text-secondary">
              <th className="px-3 py-2">Angajat</th>
              <th className="px-3 py-2 text-right">Reportate ({an - 1})</th>
              <th className="px-3 py-2 text-right">Alocate ({an})</th>
              <th className="px-3 py-2 text-right">Folosite</th>
              <th className="px-3 py-2 text-right">Ramase</th>
            </tr>
          </thead>
          <tbody>
            {randuri.map((s) => {
              const ang = angajati.find((a) => a.id === s.angajat_id);
              const esteSelectat = s.angajat_id === selectatId;
              return (
                <tr
                  key={s.angajat_id}
                  onClick={() => !doarPropriileDate && setSelectatId(esteSelectat ? null : s.angajat_id)}
                  className={`border-b border-border-faint transition ${!doarPropriileDate ? "cursor-pointer hover:bg-surface-1" : ""} ${
                    esteSelectat ? "bg-[#E8007A]/10" : ""
                  }`}
                >
                  <td className="px-3 py-2 font-medium text-text-primary">{ang?.nume}</td>
                  <td className="px-3 py-2 text-right font-mono text-amber-400">{s.reportate}</td>
                  <td className="px-3 py-2 text-right font-mono text-text-primary" onClick={(e) => e.stopPropagation()}>
                    {editandId === s.angajat_id ? (
                      <div className="flex items-center justify-end gap-1">
                        <input
                          type="number"
                          value={valoareEditare}
                          onChange={(e) => setValoareEditare(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && salveazaAlocate(s.angajat_id)}
                          autoFocus
                          className="w-16 rounded-md border border-border-subtle bg-surface-2 px-1.5 py-0.5 text-right text-text-primary"
                        />
                        <button
                          onClick={() => salveazaAlocate(s.angajat_id)}
                          disabled={isPending}
                          className="rounded p-0.5 text-[#22C55E] hover:bg-[#22C55E]/15"
                        >
                          <Check size={13} />
                        </button>
                        <button onClick={() => setEditandId(null)} className="rounded p-0.5 text-red-400 hover:bg-red-500/15">
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <span className="flex items-center justify-end gap-1.5">
                        {s.zileAlocate}
                        {!doarPropriileDate && (
                          <button
                            onClick={() => startEditare(s.angajat_id, s.zileAlocate)}
                            className="rounded p-0.5 text-text-secondary hover:bg-surface-2 hover:text-[#E8007A]"
                            title="Editeaza zilele alocate"
                          >
                            <Pencil size={12} />
                          </button>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-text-primary">{s.zileFolosite}</td>
                  <td className={`px-3 py-2 text-right font-mono ${s.zileRamase < 0 ? "text-red-400" : "text-text-primary"}`}>
                    {s.zileRamase}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

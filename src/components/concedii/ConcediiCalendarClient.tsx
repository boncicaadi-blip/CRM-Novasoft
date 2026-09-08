"use client";

import { MesajActiune } from "./MesajActiune";
import { useMemo, useState, useTransition } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { buildZileLuna, gasesteConcediuInZi, calculeazaZileLucratoare } from "@/lib/concedii-analytics";
import { createConcediuAction, stergeConcediuAction } from "@/lib/actions/concedii";
import { TIP_CONCEDIU_LABELS, TIP_CONCEDIU_COLORS } from "@/types/concedii";
import type { Angajat, ConcediuCerere, TipConcediu } from "@/types/concedii";

const LUNI_NUME = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

export function ConcediiCalendarClient({
  angajati,
  cereri,
  poateEdita = true,
}: {
  angajati: Angajat[];
  cereri: ConcediuCerere[];
  poateEdita?: boolean;
}) {
  const now = new Date();
  const [an, setAn] = useState(now.getFullYear());
  const [luna, setLuna] = useState(now.getMonth() + 1);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const angajatiActivi = useMemo(() => angajati.filter((a) => a.activ), [angajati]);
  const zileLuna = useMemo(() => buildZileLuna(an, luna), [an, luna]);

  function schimbaLuna(delta: number) {
    let nouaLuna = luna + delta;
    let nouAn = an;
    if (nouaLuna > 12) {
      nouaLuna = 1;
      nouAn += 1;
    } else if (nouaLuna < 1) {
      nouaLuna = 12;
      nouAn -= 1;
    }
    setLuna(nouaLuna);
    setAn(nouAn);
  }

  function handleDelete(id: string) {
    if (!confirm("Stergi acest concediu?")) return;
    startTransition(async () => {
      const result = await stergeConcediuAction(id);
      setMessage(result.message);
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-heading text-text-primary">Calendar concedii</h1>
          <p className="text-xs text-text-secondary">
            {poateEdita
              ? "Vizibil tuturor - transparenta cine e disponibil si cand."
              : "Doar vizualizare - transparenta cine e disponibil si cand."}
          </p>
        </div>
        {poateEdita && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA]"
          >
            <Plus size={14} />
            Inregistreaza concediu
          </button>
        )}
      </div>

      <MesajActiune message={message} />

      <div className="mb-4 flex items-center justify-center gap-3">
        <button onClick={() => schimbaLuna(-1)} className="rounded-md p-1.5 text-text-muted hover:bg-surface-1 hover:text-text-primary">
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-medium text-text-primary">
          {LUNI_NUME[luna - 1]} {an}
        </p>
        <button onClick={() => schimbaLuna(1)} className="rounded-md p-1.5 text-text-muted hover:bg-surface-1 hover:text-text-primary">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="mb-4 overflow-x-auto rounded-xl border border-border-subtle">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-1">
              <th className="sticky left-0 z-10 min-w-[140px] border-r border-border-faint bg-surface-1 px-2 py-2 text-left text-text-secondary">
                Angajat
              </th>
              {zileLuna.map((z) => (
                <th
                  key={z.data}
                  title={z.sarbatoare ?? undefined}
                  className={`min-w-[28px] border-r border-border-faint px-0.5 py-2 text-center text-[10px] ${
                    z.sarbatoare ? "text-[#22C55E]" : z.esteWeekend ? "text-text-secondary" : "text-text-primary"
                  }`}
                >
                  {Number(z.data.slice(8, 10))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {angajatiActivi.map((ang) => (
              <tr key={ang.id} className="border-b border-border-faint hover:bg-surface-1">
                <td className="sticky left-0 z-10 min-w-[140px] border-r border-border-faint bg-[#0B0D1A] px-2 py-1.5 font-medium text-text-primary">
                  {ang.nume}
                </td>
                {zileLuna.map((z) => {
                  const c = gasesteConcediuInZi(cereri, ang.id, z.data);
                  const bg = z.sarbatoare
                    ? "#22C55E"
                    : z.esteWeekend
                      ? "#94A3B833"
                      : c
                        ? TIP_CONCEDIU_COLORS[c.tip]
                        : "transparent";
                  return (
                    <td
                      key={z.data}
                      title={c ? `${TIP_CONCEDIU_LABELS[c.tip]}${c.observatii ? ` - ${c.observatii}` : ""}` : z.sarbatoare ?? undefined}
                      onClick={() => poateEdita && c && handleDelete(c.id)}
                      className={`h-7 min-w-[28px] border-r border-border-faint text-center ${poateEdita && c ? "cursor-pointer" : ""}`}
                      style={{ backgroundColor: bg }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4 rounded-lg border border-border-subtle bg-surface-1 px-3 py-2 text-[11px] text-text-secondary">
        <span className="font-medium text-text-primary">Legenda:</span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" /> Sarbatoare legala
        </span>
        {(Object.keys(TIP_CONCEDIU_LABELS) as TipConcediu[]).map((tip) => (
          <span key={tip} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TIP_CONCEDIU_COLORS[tip] }} />
            {TIP_CONCEDIU_LABELS[tip]}
          </span>
        ))}
        {poateEdita && <span className="text-text-secondary">Click pe o celula colorata pentru a sterge.</span>}
      </div>

      {zileLuna.some((z) => z.sarbatoare) && (
        <div className="mb-4 rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/5 px-3 py-2 text-xs">
          <span className="font-medium text-[#22C55E]">Sarbatori legale in {LUNI_NUME[luna - 1]}: </span>
          <span className="text-text-primary">
            {zileLuna
              .filter((z) => z.sarbatoare)
              .map((z) => `${Number(z.data.slice(8, 10))} - ${z.sarbatoare}`)
              .join(" · ")}
          </span>
        </div>
      )}

      {showForm && (
        <AdaugaConcediuModal
          angajati={angajatiActivi}
          onClose={() => setShowForm(false)}
          onSaved={(msg) => {
            setMessage(msg);
            setShowForm(false);
          }}
          isPending={isPending}
          startTransition={startTransition}
        />
      )}
    </div>
  );
}

function AdaugaConcediuModal({
  angajati,
  onClose,
  onSaved,
  isPending,
  startTransition,
}: {
  angajati: Angajat[];
  onClose: () => void;
  onSaved: (msg: string) => void;
  isPending: boolean;
  startTransition: (fn: () => Promise<void>) => void;
}) {
  const [angajatId, setAngajatId] = useState(angajati[0]?.id ?? "");
  const [tip, setTip] = useState<TipConcediu>("concediu_odihna");
  const [dataInceput, setDataInceput] = useState("");
  const [dataSfarsit, setDataSfarsit] = useState("");
  const [observatii, setObservatii] = useState("");

  const nrZile = dataInceput && dataSfarsit ? calculeazaZileLucratoare(dataInceput, dataSfarsit) : 0;

  function handleSubmit() {
    if (!angajatId || !dataInceput || !dataSfarsit) return;
    startTransition(async () => {
      const result = await createConcediuAction({
        angajat_id: angajatId,
        tip,
        data_inceput: dataInceput,
        data_sfarsit: dataSfarsit,
        nr_zile: nrZile,
        observatii: observatii || null,
      });
      onSaved(result.message);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border-subtle bg-surface-1 p-4">
        <h2 className="mb-3 text-sm font-medium text-text-primary">Inregistreaza concediu</h2>
        <div className="space-y-2.5">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">Angajat</label>
            <select
              value={angajatId}
              onChange={(e) => setAngajatId(e.target.value)}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-sm text-text-primary"
            >
              {angajati.map((a) => (
                <option key={a.id} value={a.id} style={{ backgroundColor: "var(--surface-1)" }}>
                  {a.nume}
                </option>
              ))}
            </select>
          </div>
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
            <p className="text-xs text-text-primary">{nrZile} zile lucratoare (fara weekend/sarbatori)</p>
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
            disabled={isPending || !angajatId || !dataInceput || !dataSfarsit}
            className="rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] disabled:opacity-50"
          >
            Salveaza
          </button>
        </div>
      </div>
    </div>
  );
}

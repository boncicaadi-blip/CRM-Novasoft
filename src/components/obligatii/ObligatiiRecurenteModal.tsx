"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Trash2, PlayCircle } from "lucide-react";
import {
  createObligatieRecurentaAction,
  updateObligatieRecurentaAction,
  deleteObligatieRecurentaAction,
  genereazaObligatiiRecurenteAction,
} from "@/lib/actions/obligatii-recurente";
import { getTodayISO } from "@/lib/date";
import type { ObligatieRecurenta, TipAchizitie } from "@/types/obligatii";

const inputClass =
  "w-full rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]";
const labelClass = "mb-1 block text-[11px] text-text-muted";

function RecurentaRow({ recurenta }: { recurenta: ObligatieRecurenta & { partner_nume: string | null } }) {
  const router = useRouter();
  const [panaLaData, setPanaLaData] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function handleGenereaza() {
    setMessage(null);
    startTransition(async () => {
      const result = await genereazaObligatiiRecurenteAction(recurenta.id, panaLaData);
      setMessage(
        result.success
          ? `${result.nrGenerate ?? 0} luni generate.`
          : (result.message ?? "Eroare.")
      );
      router.refresh();
    });
  }

  function handleToggleActiv() {
    startTransition(async () => {
      await updateObligatieRecurentaAction(recurenta.id, { activ: !recurenta.activ });
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteObligatieRecurentaAction(recurenta.id);
      if (result.success) router.refresh();
      else setMessage(result.message ?? "Eroare la stergere.");
    });
  }

  return (
    <div className="rounded-md border border-border-subtle bg-surface-2 p-3">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-text-primary">
            {recurenta.nume}
            {!recurenta.activ && <span className="ml-2 text-[10px] text-text-faint">(inactiv)</span>}
          </p>
          <p className="text-[11px] text-text-muted">
            {recurenta.tip === "non_factura" ? "Plata recurenta (non-factura)" : `Furnizor: ${recurenta.partner_nume ?? "—"}`}
            {" · "}
            {recurenta.valoare.toLocaleString("ro-RO")} RON, ziua {recurenta.ziua_lunii} a lunii
          </p>
        </div>
        <button
          onClick={() => setConfirmingDelete((v) => !v)}
          className="text-text-muted hover:text-red-400"
          title="Sterge regula (nu sterge randurile deja generate)"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {confirmingDelete ? (
        <div className="flex items-center gap-2 rounded-md bg-red-500/10 p-2 text-xs text-red-400">
          Sterge regula &quot;{recurenta.nume}&quot;? Randurile deja generate raman.
          <button onClick={handleDelete} disabled={isPending} className="rounded bg-red-500/20 px-2 py-1 hover:bg-red-500/30">
            Confirma
          </button>
          <button onClick={() => setConfirmingDelete(false)} className="rounded px-2 py-1 hover:bg-surface-1">
            Anuleaza
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-[11px] text-text-muted">Genereaza pana la luna:</label>
          <input
            type="month"
            value={panaLaData.slice(0, 7)}
            onChange={(e) => setPanaLaData(`${e.target.value}-01`)}
            className="rounded-md border border-border-subtle bg-surface-1 px-2 py-1 text-xs text-text-primary outline-none"
          />
          <button
            onClick={handleGenereaza}
            disabled={isPending || !recurenta.activ}
            className="flex items-center gap-1 rounded-md bg-[#E8007A] px-2.5 py-1 text-xs font-medium text-[#0B0D1A] hover:bg-[#FF4FAA] disabled:opacity-50"
          >
            <PlayCircle size={12} />
            Genereaza
          </button>
          <button
            onClick={handleToggleActiv}
            disabled={isPending}
            className="rounded-md border border-border-subtle px-2.5 py-1 text-xs text-text-secondary hover:bg-surface-1"
          >
            {recurenta.activ ? "Dezactiveaza" : "Activeaza"}
          </button>
        </div>
      )}
      {message && <p className="mt-1.5 text-[11px] text-text-muted">{message}</p>}
    </div>
  );
}

export function ObligatiiRecurenteModal({
  recurente,
  onClose,
}: {
  recurente: (ObligatieRecurenta & { partner_nume: string | null })[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const [tip, setTip] = useState<"non_factura" | "furnizor">("non_factura");
  const [nume, setNume] = useState("");
  const [cifFurnizor, setCifFurnizor] = useState("");
  const [valoare, setValoare] = useState("");
  const [ziuaLunii, setZiuaLunii] = useState("5");
  const [dataInceput, setDataInceput] = useState(getTodayISO().slice(0, 7) + "-01");
  const [dataSfarsit, setDataSfarsit] = useState("");
  const [serviciu, setServiciu] = useState("");
  const [tipAchizitie, setTipAchizitie] = useState<TipAchizitie | "">("Recurente");

  function handleCreate() {
    setMessage(null);
    if (!nume.trim() || !valoare) {
      setMessage("Nume si valoare sunt obligatorii.");
      return;
    }
    startTransition(async () => {
      const result = await createObligatieRecurentaAction({
        tip,
        nume,
        cif_furnizor: cifFurnizor || null,
        valoare: Number(valoare),
        ziua_lunii: Number(ziuaLunii),
        data_inceput: dataInceput,
        data_sfarsit: dataSfarsit || null,
        serviciu_facturat: serviciu || null,
        tip_achizitie: tipAchizitie || null,
      });
      if (result.success) {
        setNume("");
        setValoare("");
        setCifFurnizor("");
        setServiciu("");
        router.refresh();
      } else {
        setMessage(result.message ?? "Eroare la creare.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border-subtle bg-surface-1 p-5"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-heading text-text-primary">Plati recurente si prognoze</h2>
            <p className="mt-1 text-xs text-text-muted">
              Salarii, taxe, TVA, impozit (nu sunt facturi) sau facturi care se stie ca vor veni lunar de la un
              furnizor - genereaza in avans randuri in Obligatii, marcate &quot;Prognoza&quot;. Cand vine factura
              reala din SPV de la acelasi furnizor si aceeasi luna, o inlocuieste automat.
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        {recurente.length > 0 && (
          <div className="mb-5 space-y-2">
            {recurente.map((r) => (
              <RecurentaRow key={r.id} recurenta={r} />
            ))}
          </div>
        )}

        <div className="rounded-md border border-border-subtle p-3">
          <p className="mb-3 text-sm font-medium text-text-primary">Regula noua</p>
          <div className="space-y-2.5">
            <div className="flex gap-2">
              <label className="flex items-center gap-1.5 text-xs text-text-primary">
                <input type="radio" checked={tip === "non_factura"} onChange={() => setTip("non_factura")} />
                Plata recurenta (salarii, taxe, TVA...)
              </label>
              <label className="flex items-center gap-1.5 text-xs text-text-primary">
                <input type="radio" checked={tip === "furnizor"} onChange={() => setTip("furnizor")} />
                Factura recurenta de la furnizor
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>{tip === "furnizor" ? "Nume furnizor *" : "Denumire *"}</label>
                <input value={nume} onChange={(e) => setNume(e.target.value)} className={inputClass} />
              </div>
              {tip === "furnizor" && (
                <div>
                  <label className={labelClass}>CIF furnizor</label>
                  <input value={cifFurnizor} onChange={(e) => setCifFurnizor(e.target.value)} className={inputClass} />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Valoare (RON) *</label>
                <input type="number" step="0.01" value={valoare} onChange={(e) => setValoare(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Ziua lunii (1-28)</label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={ziuaLunii}
                  onChange={(e) => setZiuaLunii(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Incepe din luna</label>
                <input
                  type="month"
                  value={dataInceput.slice(0, 7)}
                  onChange={(e) => setDataInceput(`${e.target.value}-01`)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Se opreste din luna (optional)</label>
                <input
                  type="month"
                  value={dataSfarsit.slice(0, 7)}
                  onChange={(e) => setDataSfarsit(e.target.value ? `${e.target.value}-01` : "")}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Serviciu / descriere</label>
              <input value={serviciu} onChange={(e) => setServiciu(e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Tip achizitie</label>
              <select value={tipAchizitie} onChange={(e) => setTipAchizitie(e.target.value as TipAchizitie | "")} className={inputClass}>
                <option value="Recurente" style={{ backgroundColor: "var(--surface-1)" }}>
                  Recurente
                </option>
                <option value="Nerecurente" style={{ backgroundColor: "var(--surface-1)" }}>
                  Nerecurente
                </option>
              </select>
            </div>

            {message && <p className="text-xs text-amber-400">{message}</p>}

            <button
              onClick={handleCreate}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] hover:bg-[#FF4FAA] disabled:opacity-50"
            >
              <Plus size={14} />
              Adauga regula
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

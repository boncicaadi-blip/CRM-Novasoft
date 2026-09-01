"use client";

import { useState, useRef, useTransition } from "react";
import Link from "next/link";
import { Pencil, Check, X, CheckCircle2, CalendarDays } from "lucide-react";
import { InfoRow, LabeledInput } from "@/components/overview/InfoCard";
import { TextInput, TextArea, Select } from "@/components/form/fields";
import { useSaveShortcut } from "@/lib/hooks/useSaveShortcut";
import { getTodayISO } from "@/lib/date";
import {
  updateOpportunitySectionAction,
  finalizeActionAction,
} from "@/lib/actions/opportunities";
import type { Opportunity } from "@/types/opportunity";

const FIELDS = [
  "actiune",
  "status_actiune",
  "data_actiune",
  "data_finalizare_actiune",
  "observatii_actiune",
  "responsabil_actiune_id",
];

function fmtDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("ro-RO");
}

function toDateInputValue(v: string | null | undefined) {
  if (!v) return "";
  return v.slice(0, 10);
}

export function ActiuneCard({
  o,
  actiuni,
  statusActiune,
  profiles,
  currentUserId,
}: {
  o: Opportunity;
  actiuni: string[];
  statusActiune: string[];
  profiles: { id: string; full_name: string }[];
  currentUserId: string;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "finalize">("view");

  if (mode === "finalize") {
    return <FinalizeForm o={o} onDone={() => setMode("view")} />;
  }

  if (mode === "edit") {
    return (
      <EditForm
        o={o}
        actiuni={actiuni}
        statusActiune={statusActiune}
        profiles={profiles}
        currentUserId={currentUserId}
        onDone={() => setMode("view")}
      />
    );
  }

  const responsabilActiune = profiles.find((p) => p.id === o.responsabil_actiune_id);

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Actiune curenta
        </p>
        <div className="flex items-center gap-1">
          {o.actiune && (
            <Link
              href="/calendar"
              className="flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-[11px] font-medium text-text-secondary transition hover:border-[#0070F3] hover:text-[#0070F3]"
              title="Vezi in calendar"
            >
              <CalendarDays size={13} />
              Vezi in calendar
            </Link>
          )}
          <button
            onClick={() => setMode("edit")}
            className="rounded-md p-1 text-text-muted transition hover:bg-surface-1 hover:text-[#E8007A]"
            title="Editeaza Actiune curenta"
          >
            <Pencil size={13} />
          </button>
        </div>
      </div>
      <div className="divide-y divide-white/5">
        <InfoRow label="Actiune" value={o.actiune} />
        <InfoRow label="Status actiune" value={o.status_actiune} />
        <InfoRow label="Data actiune" value={fmtDate(o.data_actiune)} />
        <InfoRow label="Responsabil actiune" value={responsabilActiune?.full_name ?? null} />
        <InfoRow label="Data finalizare" value={fmtDate(o.data_finalizare_actiune)} />
        {o.observatii_actiune && (
          <div className="py-1.5">
            <span className="text-xs text-text-muted">Observatii actiune</span>
            <p className="mt-1 text-sm text-text-primary">{o.observatii_actiune}</p>
          </div>
        )}
        {!o.actiune && (
          <p className="py-1.5 text-xs text-text-muted">Nicio actiune programata.</p>
        )}
      </div>

      {o.actiune && o.status_actiune === "Planificata" && (
        <button
          onClick={() => setMode("finalize")}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-md border border-green-500/30 bg-green-500/10 py-2 text-sm font-medium text-green-400 transition hover:bg-green-500/20"
        >
          <CheckCircle2 size={15} />
          Finalizeaza actiunea
        </button>
      )}
    </div>
  );
}

/** Editare directa, neschimbata - modifica actiunea curenta in loc, fara sa stearga nimic. */
function EditForm({
  o,
  actiuni,
  statusActiune,
  profiles,
  currentUserId,
  onDone,
}: {
  o: Opportunity;
  actiuni: string[];
  statusActiune: string[];
  profiles: { id: string; full_name: string }[];
  currentUserId: string;
  onDone: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useSaveShortcut(formRef, true);

  function handleSubmit(formData: FormData) {
    formData.set("__fields", FIELDS.join(","));
    setError(null);
    startTransition(async () => {
      const result = await updateOpportunitySectionAction(o.id, formData);
      if (result.success) {
        onDone();
      } else {
        setError(result.message ?? "A aparut o eroare la salvare.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
        Actiune curenta
      </p>
      <form ref={formRef} action={handleSubmit} className="space-y-2.5">
        <LabeledInput label="Actiune">
          <Select name="actiune" defaultValue={o.actiune ?? ""} options={actiuni} />
        </LabeledInput>
        <LabeledInput label="Status actiune">
          <Select
            name="status_actiune"
            defaultValue={o.status_actiune ?? ""}
            options={statusActiune}
          />
        </LabeledInput>
        <LabeledInput label="Data actiune">
          <TextInput type="date" name="data_actiune" defaultValue={toDateInputValue(o.data_actiune)} />
        </LabeledInput>
        <LabeledInput label="Responsabil actiune">
          <select
            name="responsabil_actiune_id"
            defaultValue={o.responsabil_actiune_id ?? currentUserId}
            className="w-full rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id} style={{ backgroundColor: "var(--surface-1)" }}>
                {p.full_name}
              </option>
            ))}
          </select>
        </LabeledInput>
        <LabeledInput label="Data finalizare">
          <TextInput
            type="date"
            name="data_finalizare_actiune"
            defaultValue={toDateInputValue(o.data_finalizare_actiune)}
          />
        </LabeledInput>
        <LabeledInput label="Observatii actiune">
          <TextArea name="observatii_actiune" defaultValue={o.observatii_actiune ?? ""} />
        </LabeledInput>

        {error && (
          <p className="rounded-md bg-red-500/10 px-2.5 py-2 text-xs text-red-400">{error}</p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1 rounded-md bg-[#E8007A] px-2.5 py-1.5 text-xs font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
            title="Salveaza (Ctrl+S)"
          >
            <Check size={13} />
            {isPending ? "Se salveaza..." : "Salveaza"}
          </button>
          <button
            type="button"
            onClick={onDone}
            disabled={isPending}
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-text-secondary transition hover:bg-surface-1"
          >
            <X size={13} />
            Anuleaza
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * Finalizare: cere rezultat (obligatoriu), curata complet campurile vechi
 * de Observatii/Data finalizare, si permite programarea optionala a unui
 * urmator next step - acelasi flux ca pe pagina Actiuni, dar disponibil
 * direct pe fisa.
 */
function FinalizeForm({ o, onDone }: { o: Opportunity; onDone: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [rezultat, setRezultat] = useState("");
  const [dataFinalizare, setDataFinalizare] = useState(getTodayISO());
  const [nextActiune, setNextActiune] = useState("");
  const [nextData, setNextData] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rezultat.trim()) {
      setError("Rezultatul actiunii este obligatoriu.");
      return;
    }
    setError(null);
    startTransition(async () => {
      await finalizeActionAction(
        o.id,
        rezultat,
        nextActiune && nextData ? { actiune: nextActiune, dataActiune: nextData } : undefined,
        dataFinalizare
      );
      onDone();
    });
  }

  return (
    <div className="rounded-xl border border-green-500/30 bg-green-500/[0.03] p-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
        Finalizeaza: {o.actiune}
      </p>
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <LabeledInput label="Rezultat actiune *">
          <TextArea
            value={rezultat}
            onChange={(e) => setRezultat(e.target.value)}
            placeholder="Ce s-a discutat / rezultat..."
          />
        </LabeledInput>
        <LabeledInput label="Data finalizare">
          <TextInput
            type="date"
            value={dataFinalizare}
            onChange={(e) => setDataFinalizare(e.target.value)}
          />
        </LabeledInput>

        <div className="border-t border-border-faint pt-2.5">
          <p className="mb-2 text-[11px] text-text-muted">Urmatorul pas (optional)</p>
          <div className="grid grid-cols-2 gap-2">
            <LabeledInput label="Actiune">
              <TextInput
                value={nextActiune}
                onChange={(e) => setNextActiune(e.target.value)}
                placeholder="opțional"
              />
            </LabeledInput>
            <LabeledInput label="Data">
              <TextInput
                type="date"
                value={nextData}
                onChange={(e) => setNextData(e.target.value)}
              />
            </LabeledInput>
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-red-500/10 px-2.5 py-2 text-xs text-red-400">{error}</p>
        )}

        <div className="flex items-center gap-2 pt-1">
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-1 rounded-md bg-green-500 px-2.5 py-1.5 text-xs font-medium text-[#0B0D1A] transition hover:bg-green-400 disabled:opacity-50"
          >
            <Check size={13} />
            {isPending ? "Se salveaza..." : "Confirma finalizarea"}
          </button>
          <button
            type="button"
            onClick={onDone}
            disabled={isPending}
            className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-text-secondary transition hover:bg-surface-1"
          >
            <X size={13} />
            Anuleaza
          </button>
        </div>
      </form>
    </div>
  );
}

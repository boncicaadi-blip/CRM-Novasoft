"use client";

import { useState, useRef, useTransition } from "react";
import { Pencil, Check, X } from "lucide-react";
import { InfoRow, LabeledInput } from "@/components/overview/InfoCard";
import { TextInput } from "@/components/form/fields";
import { useSaveShortcut } from "@/lib/hooks/useSaveShortcut";
import { updateOpportunitySectionAction } from "@/lib/actions/opportunities";
import type { Opportunity } from "@/types/opportunity";

const FIELDS = ["contact_nume", "contact_functie", "contact_telefon", "contact_email"];

export function ContactCard({ o }: { o: Opportunity }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useSaveShortcut(formRef, editing);

  function handleSubmit(formData: FormData) {
    formData.set("__fields", FIELDS.join(","));
    setError(null);
    startTransition(async () => {
      try {
        const result = await updateOpportunitySectionAction(o.id, formData);
        if (result.success) {
          setEditing(false);
        } else {
          setError(result.message ?? "A aparut o eroare la salvare.");
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "A aparut o eroare la salvare.");
      }
    });
  }

  const hasContact = o.contact_nume || o.contact_telefon || o.contact_email;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Persoana de contact
        </p>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-md p-1 text-slate-500 transition hover:bg-white/5 hover:text-[#E8007A]"
            title="Editeaza Persoana de contact"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {editing ? (
        <form ref={formRef} action={handleSubmit} className="space-y-2.5">
          <LabeledInput label="Nume">
            <TextInput name="contact_nume" defaultValue={o.contact_nume ?? ""} />
          </LabeledInput>
          <LabeledInput label="Functie">
            <TextInput name="contact_functie" defaultValue={o.contact_functie ?? ""} />
          </LabeledInput>
          <LabeledInput label="Telefon">
            <TextInput type="tel" name="contact_telefon" defaultValue={o.contact_telefon ?? ""} />
          </LabeledInput>
          <LabeledInput label="Email">
            <TextInput type="email" name="contact_email" defaultValue={o.contact_email ?? ""} />
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
              onClick={() => setEditing(false)}
              disabled={isPending}
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-slate-400 transition hover:bg-white/5"
            >
              <X size={13} />
              Anuleaza
            </button>
          </div>
        </form>
      ) : hasContact ? (
        <div className="divide-y divide-white/5">
          <InfoRow label="Nume" value={o.contact_nume} />
          <InfoRow label="Functie" value={o.contact_functie} />
          <InfoRow
            label="Telefon"
            value={
              o.contact_telefon ? (
                <a href={`tel:${o.contact_telefon}`} className="hover:text-[#E8007A]">
                  {o.contact_telefon}
                </a>
              ) : null
            }
          />
          <InfoRow
            label="Email"
            value={
              o.contact_email ? (
                <a href={`mailto:${o.contact_email}`} className="hover:text-[#E8007A]">
                  {o.contact_email}
                </a>
              ) : null
            }
          />
        </div>
      ) : (
        <p className="text-xs text-slate-500">Nicio persoana de contact adaugata.</p>
      )}
    </div>
  );
}

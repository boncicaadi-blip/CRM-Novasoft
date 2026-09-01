"use client";

import { useState, useRef, useTransition } from "react";
import { Pencil, Check, X } from "lucide-react";
import { InfoRow, LabeledInput } from "@/components/overview/InfoCard";
import { TextInput } from "@/components/form/fields";
import { useSaveShortcut } from "@/lib/hooks/useSaveShortcut";
import { updateOpportunitySectionAction } from "@/lib/actions/opportunities";
import { getCompanyLogoUrl } from "@/lib/logo";
import type { Opportunity, Profile } from "@/types/opportunity";

const FIELDS = ["nume_potential", "cod_fiscal", "responsabil_vanzare_id"];

const optionStyle = { backgroundColor: "var(--surface-1)", color: "var(--text-primary)" };

export function FirmaCard({ o, profiles }: { o: Opportunity; profiles: Profile[] }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useSaveShortcut(formRef, editing);
  const logoUrl = getCompanyLogoUrl(o.partner?.website, 64);

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

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-text-muted">
          {logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt=""
              className="h-5 w-5 rounded border border-border-subtle bg-white object-contain p-0.5"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          Firma
        </p>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-md p-1 text-text-muted transition hover:bg-surface-1 hover:text-[#E8007A]"
            title="Editeaza Firma"
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      <p className="mb-2 text-[11px] text-text-faint">
        Restul datelor de firma (domeniu, contacte, cifra de afaceri, calificare) s-au mutat in
        Fisa Partenerului - vezi butonul de sus.
      </p>

      {editing ? (
        <form ref={formRef} action={handleSubmit} className="space-y-2.5">
          <LabeledInput label="Nume potential">
            <TextInput name="nume_potential" defaultValue={o.nume_potential} required />
          </LabeledInput>
          <LabeledInput label="Cod fiscal">
            <TextInput name="cod_fiscal" defaultValue={o.cod_fiscal ?? ""} />
          </LabeledInput>
          <LabeledInput label="Responsabil vanzare">
            <select
              name="responsabil_vanzare_id"
              defaultValue={o.responsabil_vanzare_id ?? ""}
              className="w-full rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
            >
              <option value="" style={optionStyle}>
                Selecteaza...
              </option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id} style={optionStyle}>
                  {p.full_name}
                </option>
              ))}
            </select>
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
              className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-text-secondary transition hover:bg-surface-1"
            >
              <X size={13} />
              Anuleaza
            </button>
          </div>
        </form>
      ) : (
        <div className="divide-y divide-white/5">
          <InfoRow label="Nume potential" value={o.nume_potential} />
          <InfoRow label="Cod fiscal" value={o.cod_fiscal} />
          <InfoRow label="Responsabil vanzare" value={o.profiles?.full_name} />
        </div>
      )}
    </div>
  );
}

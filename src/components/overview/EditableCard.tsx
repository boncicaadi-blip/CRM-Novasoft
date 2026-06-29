"use client";

import { useState, useTransition, useRef, type ReactNode } from "react";
import { Pencil, Check, X } from "lucide-react";
import { updateOpportunitySectionAction } from "@/lib/actions/opportunities";
import { useSaveShortcut } from "@/lib/hooks/useSaveShortcut";

export function EditableCard({
  title,
  opportunityId,
  fields,
  viewContent,
  editContent,
}: {
  title: string;
  opportunityId: string;
  /** Lista de campuri (numele coloanelor din DB) pe care le include acest formular. */
  fields: string[];
  viewContent: ReactNode;
  editContent: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  useSaveShortcut(formRef, editing);

  function handleSubmit(formData: FormData) {
    formData.set("__fields", fields.join(","));
    startTransition(async () => {
      await updateOpportunitySectionAction(opportunityId, formData);
      setEditing(false);
    });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="rounded-md p-1 text-slate-500 transition hover:bg-white/5 hover:text-[#E8007A]"
            title={`Editeaza ${title}`}
          >
            <Pencil size={13} />
          </button>
        )}
      </div>

      {editing ? (
        <form ref={formRef} action={handleSubmit} className="space-y-2.5">
          {editContent}
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
      ) : (
        <div className="divide-y divide-white/5">{viewContent}</div>
      )}
    </div>
  );
}

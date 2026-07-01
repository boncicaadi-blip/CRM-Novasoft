"use client";

import { useState, useTransition } from "react";
import { updateTargetComercialAction } from "@/lib/actions/settings";

export function TargetComercialForm({ initialValue }: { initialValue: number | null }) {
  const [value, setValue] = useState(initialValue !== null ? String(initialValue) : "");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const parsed = value.trim() === "" ? null : Number(value);

    startTransition(async () => {
      const result = await updateTargetComercialAction(parsed);
      if (result.success) {
        setMessage({ type: "success", text: "Target salvat." });
      } else {
        setMessage({ type: "error", text: result.message ?? "Eroare la salvare." });
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-sm rounded-xl border border-white/10 bg-white/[0.02] p-4"
    >
      <label className="mb-1.5 block text-xs text-slate-500">Target comercial lunar (EUR)</label>
      <div className="flex gap-2">
        <input
          type="number"
          min={0}
          step="1"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ex: 500000"
          className="flex-1 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-[#E8007A]"
        />
        <button
          type="submit"
          disabled={isPending}
          className="shrink-0 rounded-md bg-[#E8007A] px-3 py-2 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
        >
          {isPending ? "..." : "Salveaza"}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-slate-500">
        Folosit pentru Pipeline Coverage (Pipeline Activ / Target) in Raportul Comercial.
      </p>
      {message && (
        <p
          className={`mt-2 text-xs ${message.type === "success" ? "text-green-400" : "text-red-400"}`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}

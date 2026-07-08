"use client";

import { useState, useTransition } from "react";
import { updateTermeneCredentialsAction } from "@/lib/actions/apiCredentials";
import type { TermeneCredentials } from "@/lib/data/apiCredentials";

export function TermeneCredentialsForm({ initial }: { initial: TermeneCredentials }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await updateTermeneCredentialsAction(formData);
      setMessage({
        type: result.success ? "success" : "error",
        text: result.message ?? "",
      });
    });
  }

  return (
    <form action={handleSubmit} className="max-w-md space-y-3">
      <div>
        <label className="mb-1 block text-xs text-text-secondary">Utilizator</label>
        <input
          name="username"
          defaultValue={initial.username ?? ""}
          required
          className="w-full rounded-md border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none focus:border-[#E8007A]"
          placeholder="ex: adrian.boncica9d9zZ"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-text-secondary">Parola</label>
        <input
          name="password"
          defaultValue={initial.password ?? ""}
          required
          className="w-full rounded-md border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none focus:border-[#E8007A]"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-text-secondary">Schema Key</label>
        <input
          name="schemaKey"
          defaultValue={initial.schemaKey ?? ""}
          required
          className="w-full rounded-md border border-border-subtle bg-surface-2 px-3 py-2 text-sm font-mono text-text-primary outline-none focus:border-[#E8007A]"
        />
      </div>

      {message && (
        <p
          className={`text-xs ${message.type === "success" ? "text-green-400" : "text-red-400"}`}
        >
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-[#E8007A] px-4 py-2 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
      >
        {isPending ? "Se salveaza..." : "Salveaza"}
      </button>
    </form>
  );
}

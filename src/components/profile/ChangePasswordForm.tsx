"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
  const supabase = createClient();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Parola trebuie sa aiba minim 6 caractere." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Parolele nu coincid." });
      return;
    }

    setIsPending(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsPending(false);

    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }

    setMessage({ type: "success", text: "Parola a fost schimbata cu succes." });
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs text-text-secondary">Parola noua</label>
        <input
          type="password"
          minLength={6}
          required
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-md border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none focus:border-[#E8007A]"
          placeholder="••••••••"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-text-secondary">Confirma parola noua</label>
        <input
          type="password"
          minLength={6}
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-md border border-border-subtle bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none focus:border-[#E8007A]"
          placeholder="••••••••"
        />
      </div>

      {message && (
        <p className={`text-xs ${message.type === "success" ? "text-green-400" : "text-red-400"}`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-[#E8007A] px-4 py-2 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
      >
        {isPending ? "Se salveaza..." : "Schimba parola"}
      </button>
    </form>
  );
}

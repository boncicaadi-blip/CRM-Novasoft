"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Parola trebuie sa aiba minim 6 caractere.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Parolele nu coincid.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/");
      router.refresh();
    }, 1500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-0 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Image
            src="/icon-192.png"
            alt="NovaSales"
            width={64}
            height={64}
            className="mx-auto mb-3 h-16 w-16 rounded-2xl"
            priority
          />
          <h1 className="font-heading text-xl text-text-primary">NovaSales</h1>
          <p className="text-sm text-text-secondary">Novasoft CRM</p>
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-1 p-6">
          <h2 className="mb-4 text-sm font-medium text-text-primary">Seteaza o parola noua</h2>

          {success ? (
            <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-400">
              Parola a fost schimbata. Te ducem in aplicatie...
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-text-secondary">Parola noua</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary outline-none focus:border-[#E8007A]"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-text-secondary">Confirma parola noua</label>
                <input
                  required
                  type="password"
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary outline-none focus:border-[#E8007A]"
                  placeholder="••••••••"
                />
              </div>

              {error && <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-md bg-[#E8007A] py-2 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
              >
                {loading ? "Se salveaza..." : "Salveaza parola noua"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

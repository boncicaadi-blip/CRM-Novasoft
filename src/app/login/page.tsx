"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { notificaAdminiUtilizatorNou } from "@/lib/actions/users";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSuccess("Daca exista un cont cu aceasta adresa, ai primit un email cu un link de resetare a parolei.");
    setEmail("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (mode === "forgot") {
      await handleForgotPassword(e);
      return;
    }

    setLoading(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Email sau parola incorecta.");
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
      return;
    }

    // Signup: contul nu are inca o sesiune activa (trebuie confirmat emailul
    // intai, apoi aprobat de un admin) - nu are sens sa redirectionam catre
    // aplicatie, ramanem pe pagina si aratam un mesaj clar de succes.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess("Cont creat! Verifica adresa de email pentru confirmare, apoi asteapta aprobarea unui administrator.");
    setLoading(false);
    setEmail("");
    setPassword("");
    setFullName("");
    notificaAdminiUtilizatorNou({ email, fullName }).catch(() => {});
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
          <div className="mb-5 flex gap-1 rounded-lg bg-surface-1 p-1 text-sm">
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 rounded-md py-1.5 transition ${
                mode === "signin" || mode === "forgot" ? "bg-[#E8007A] text-[#0B0D1A] font-medium" : "text-text-primary"
              }`}
            >
              Autentificare
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
                setSuccess(null);
              }}
              className={`flex-1 rounded-md py-1.5 transition ${
                mode === "signup" ? "bg-[#E8007A] text-[#0B0D1A] font-medium" : "text-text-primary"
              }`}
            >
              Cont nou
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "forgot" && (
              <div>
                <p className="mb-3 text-sm text-text-secondary">
                  Introdu adresa de email cu care ai cont - iti trimitem un link de resetare a parolei.
                </p>
              </div>
            )}
            {success ? (
              <p className="rounded-md bg-green-500/10 px-3 py-2 text-sm text-green-400">{success}</p>
            ) : (
              <>
                {mode === "signup" && (
                  <div>
                    <label className="mb-1 block text-xs text-text-secondary">Nume complet</label>
                    <input
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary outline-none focus:border-[#E8007A]"
                      placeholder="Adrian Boncica"
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs text-text-secondary">Email</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary outline-none focus:border-[#E8007A]"
                    placeholder="tu@firma.ro"
                  />
                </div>
                {mode !== "forgot" && (
                  <div>
                    <label className="mb-1 block text-xs text-text-secondary">Parola</label>
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
                )}
                {mode === "signin" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-xs text-text-secondary hover:text-[#E8007A]"
                  >
                    Am uitat parola
                  </button>
                )}

                {error && (
                  <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-md bg-[#E8007A] py-2 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
                >
                  {loading
                    ? "Se proceseaza..."
                    : mode === "signin"
                      ? "Intra in cont"
                      : mode === "forgot"
                        ? "Trimite link de resetare"
                        : "Creeaza cont"}
                </button>
                {mode === "forgot" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode("signin");
                      setError(null);
                      setSuccess(null);
                    }}
                    className="w-full text-center text-xs text-text-secondary hover:text-[#E8007A]"
                  >
                    Inapoi la autentificare
                  </button>
                )}
              </>
            )}
          </form>
        </div>
        <p className="mt-4 text-center text-[11px] text-text-faint">Creat de Adrian Boncica</p>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError("Email sau parola incorecta.");
        setLoading(false);
        return;
      }
    } else {
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
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0F14] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#2DD4BF] text-[#0B0F14] font-bold text-lg">
            P
          </div>
          <h1 className="text-xl font-semibold text-white">Pipeline</h1>
          <p className="mt-1 text-sm text-slate-400">
            Strategie comerciala 2026
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
          <div className="mb-5 flex gap-1 rounded-lg bg-white/5 p-1 text-sm">
            <button
              type="button"
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-md py-1.5 transition ${
                mode === "signin" ? "bg-[#2DD4BF] text-[#0B0F14] font-medium" : "text-slate-300"
              }`}
            >
              Autentificare
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md py-1.5 transition ${
                mode === "signup" ? "bg-[#2DD4BF] text-[#0B0F14] font-medium" : "text-slate-300"
              }`}
            >
              Cont nou
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="mb-1 block text-xs text-slate-400">Nume complet</label>
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#2DD4BF]"
                  placeholder="Adrian Boncica"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs text-slate-400">Email</label>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#2DD4BF]"
                placeholder="tu@firma.ro"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-400">Parola</label>
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#2DD4BF]"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[#2DD4BF] py-2 text-sm font-medium text-[#0B0F14] transition hover:bg-[#5EEAD4] disabled:opacity-50"
            >
              {loading ? "Se proceseaza..." : mode === "signin" ? "Intra in cont" : "Creeaza cont"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { upsertAngajatiAnAction } from "@/lib/actions/angajati";
import type { AngajatiLunarRow } from "@/lib/data/angajati";

const LUNI = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

export function AngajatiForm({ rows }: { rows: AngajatiLunarRow[] }) {
  const anCurent = new Date().getFullYear();
  const [anSelectat, setAnSelectat] = useState(anCurent);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const aniDisponibili = Array.from(new Set([...rows.map((r) => r.an), anCurent])).sort((a, b) => b - a);

  const initialValues = (an: number) => {
    const map = new Map(rows.filter((r) => r.an === an).map((r) => [r.luna, r.nr_angajati]));
    return Array.from({ length: 12 }, (_, i) => String(map.get(i + 1) ?? 0));
  };

  const [values, setValues] = useState<string[]>(() => initialValues(anSelectat));

  function handleAnChange(an: number) {
    setAnSelectat(an);
    setValues(initialValues(an));
    setMessage(null);
  }

  function handleSaveAll() {
    setMessage(null);
    startTransition(async () => {
      const luni = values.map((v, i) => ({ luna: i + 1, nrAngajati: Number(v) || 0 }));
      const result = await upsertAngajatiAnAction(anSelectat, luni);
      setMessage(result.success ? `Salvat, tot anul ${anSelectat}.` : (result.message ?? "Eroare."));
    });
  }

  const mediePeAn = (() => {
    const nums = values.map(Number).filter((v) => v > 0);
    if (nums.length === 0) return null;
    return nums.reduce((s, v) => s + v, 0) / nums.length;
  })();

  return (
    <div className="max-w-md rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-2">
        <label className="text-xs text-slate-500">An:</label>
        <select
          value={anSelectat}
          onChange={(e) => handleAnChange(Number(e.target.value))}
          className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-[#E8007A]"
        >
          {aniDisponibili.map((an) => (
            <option key={an} value={an} style={{ backgroundColor: "#111535" }}>
              {an}
            </option>
          ))}
        </select>
        <button
          onClick={() => handleAnChange(anSelectat - 1)}
          className="ml-auto rounded-md border border-white/10 px-2 py-1 text-xs text-slate-400 hover:bg-white/5"
        >
          An anterior
        </button>
      </div>

      {mediePeAn !== null && (
        <p className="mb-3 rounded-md border border-white/5 bg-white/[0.02] px-2.5 py-1.5 text-xs text-slate-400">
          Medie {anSelectat} (din lunile completate): <span className="font-mono text-white">{mediePeAn.toFixed(1)}</span>
        </p>
      )}

      <div>
        {LUNI.map((label, i) => (
          <div key={i} className="flex items-center gap-2 border-b border-white/5 py-1.5 last:border-0">
            <span className="w-24 text-sm text-slate-400">{label}</span>
            <input
              type="number"
              min={0}
              step="1"
              value={values[i]}
              onChange={(e) => {
                const next = [...values];
                next[i] = e.target.value;
                setValues(next);
              }}
              className="w-20 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-white outline-none focus:border-[#E8007A]"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSaveAll}
        disabled={isPending}
        className="mt-4 w-full rounded-md bg-[#E8007A] py-2 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
      >
        {isPending ? "Se salveaza..." : `Salveaza tot anul ${anSelectat}`}
      </button>
      {message && <p className="mt-2 text-center text-xs text-slate-400">{message}</p>}

      <p className="mt-3 text-[11px] text-slate-500">
        Numarul mediu de angajati, per luna, se foloseste pentru productivitate (Venit / Angajat) si
        cost per angajat (Cheltuieli / Angajat) in Management.
      </p>
    </div>
  );
}

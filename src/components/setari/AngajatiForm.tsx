"use client";

import { useState, useTransition } from "react";
import { upsertAngajatiLunarAction } from "@/lib/actions/angajati";
import type { AngajatiLunarRow } from "@/lib/data/angajati";

const LUNI = [
  "Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie",
  "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie",
];

function LunaRow({ an, luna, initial }: { an: number; luna: number; initial: number }) {
  const [value, setValue] = useState(String(initial));
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      const result = await upsertAngajatiLunarAction(an, luna, Number(value));
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
      }
    });
  }

  return (
    <div className="flex items-center gap-2 border-b border-white/5 py-1.5 last:border-0">
      <span className="w-24 text-sm text-slate-400">{LUNI[luna - 1]}</span>
      <input
        type="number"
        min={0}
        step="1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-20 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-white outline-none focus:border-[#E8007A]"
      />
      <button
        onClick={handleSave}
        disabled={isPending}
        className="rounded-md bg-[#E8007A] px-2.5 py-1 text-xs font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
      >
        {isPending ? "..." : "Salveaza"}
      </button>
      {saved && <span className="text-[11px] text-green-400">Salvat.</span>}
    </div>
  );
}

export function AngajatiForm({ rows }: { rows: AngajatiLunarRow[] }) {
  const anCurent = new Date().getFullYear();
  const [anSelectat, setAnSelectat] = useState(anCurent);

  const aniDisponibili = Array.from(new Set([...rows.map((r) => r.an), anCurent])).sort((a, b) => b - a);
  const valueByLuna = new Map(rows.filter((r) => r.an === anSelectat).map((r) => [r.luna, r.nr_angajati]));

  const mediePeAn = (() => {
    const luniCompletate = Array.from(valueByLuna.values());
    if (luniCompletate.length === 0) return null;
    return luniCompletate.reduce((s, v) => s + v, 0) / luniCompletate.length;
  })();

  return (
    <div className="max-w-md rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-2">
        <label className="text-xs text-slate-500">An:</label>
        <select
          value={anSelectat}
          onChange={(e) => setAnSelectat(Number(e.target.value))}
          className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-[#E8007A]"
        >
          {aniDisponibili.map((an) => (
            <option key={an} value={an} style={{ backgroundColor: "#111535" }}>
              {an}
            </option>
          ))}
        </select>
        <button
          onClick={() => setAnSelectat((a) => a - 1)}
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
        {Array.from({ length: 12 }, (_, i) => i + 1).map((luna) => (
          <LunaRow key={luna} an={anSelectat} luna={luna} initial={valueByLuna.get(luna) ?? 0} />
        ))}
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        Numarul mediu de angajati, per luna, se foloseste pentru productivitate (Venit / Angajat) si
        cost per angajat (Cheltuieli / Angajat) in Management.
      </p>
    </div>
  );
}

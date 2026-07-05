"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { upsertTargetComercialAnAction } from "@/lib/actions/settings";
import type { TargetAnual } from "@/lib/data/settings";

function EditableRow({ an, target }: { an: number; target: number }) {
  const [value, setValue] = useState(String(target));
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await upsertTargetComercialAnAction(an, Number(value));
      setMessage(result.success ? "Salvat." : (result.message ?? "Eroare."));
    });
  }

  return (
    <div className="flex items-center gap-2 border-b border-white/5 py-2 last:border-0">
      <span className="w-16 font-mono text-sm text-white">{an}</span>
      <input
        type="number"
        min={0}
        step="1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-white outline-none focus:border-[#E8007A]"
      />
      <button
        onClick={handleSave}
        disabled={isPending}
        className="shrink-0 rounded-md bg-[#E8007A] px-3 py-1.5 text-xs font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
      >
        {isPending ? "..." : "Salveaza"}
      </button>
      {message && <span className="text-[11px] text-slate-500">{message}</span>}
    </div>
  );
}

export function TargetComercialForm({ targete }: { targete: TargetAnual[] }) {
  const anCurent = new Date().getFullYear();

  const [aniAfisati, setAniAfisati] = useState<number[]>(
    Array.from(new Set([...targete.map((t) => t.an), anCurent])).sort((a, b) => b - a)
  );
  const [anNou, setAnNou] = useState("");

  const targetByAn = new Map(targete.map((t) => [t.an, t.target]));

  function handleAddAn() {
    const an = Number(anNou);
    if (!an || aniAfisati.includes(an)) return;
    setAniAfisati((prev) => [...prev, an].sort((a, b) => b - a));
    setAnNou("");
  }

  return (
    <div className="max-w-md rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <label className="mb-1.5 block text-xs text-slate-500">Target comercial anual (EUR)</label>
      <div className="mb-2">
        {aniAfisati.map((an) => (
          <EditableRow key={an} an={an} target={targetByAn.get(an) ?? 0} />
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-white/10 pt-3">
        <input
          type="number"
          value={anNou}
          onChange={(e) => setAnNou(e.target.value)}
          placeholder={`ex: ${anCurent - 1}`}
          className="w-24 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-sm text-white outline-none focus:border-[#E8007A]"
        />
        <button
          onClick={handleAddAn}
          className="flex items-center gap-1 rounded-md border border-white/10 px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/5"
        >
          <Plus size={13} />
          Adauga an
        </button>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        Targetul anului curent e folosit pentru Pipeline Coverage in Raportul Comercial. Poti
        completa si anii anteriori, retroactiv, ca sa te raportezi la istoric.
      </p>
    </div>
  );
}

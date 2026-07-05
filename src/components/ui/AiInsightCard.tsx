"use client";

import { useState, useTransition } from "react";
import { Sparkles, AlertTriangle, ListChecks, RefreshCw } from "lucide-react";
import type { FinancialInsightResult } from "@/lib/ai/financial-prompts";

export function AiInsightCard({
  title,
  generateAction,
}: {
  title: string;
  generateAction: () => Promise<{ success: boolean; message?: string; data?: FinancialInsightResult }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<FinancialInsightResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const res = await generateAction();
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.message ?? "Eroare la generare.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-[#E8007A]/20 bg-[#E8007A]/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white">
          <Sparkles size={15} className="text-[#E8007A]" />
          {title}
        </p>
        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-md bg-[#E8007A] px-2.5 py-1.5 text-xs font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
        >
          {result ? <RefreshCw size={12} /> : <Sparkles size={12} />}
          {isPending ? "Se genereaza..." : result ? "Regenereaza" : "Genereaza interpretare"}
        </button>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {!result && !error && !isPending && (
        <p className="text-xs text-slate-500">
          Trimite un sumar al cifrelor curente catre Claude si primesti o interpretare - ce arata
          datele, ce riscuri sunt vizibile si ce ai putea face concret.
        </p>
      )}

      {isPending && <p className="text-xs text-slate-500">Se analizeaza datele curente...</p>}

      {result && (
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">Rezumat</p>
            <p className="text-sm text-slate-200">{result.rezumat}</p>
          </div>
          <div>
            <p className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-amber-500">
              <AlertTriangle size={11} />
              Riscuri
            </p>
            <p className="text-sm text-slate-200">{result.riscuri}</p>
          </div>
          <div>
            <p className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-green-500">
              <ListChecks size={11} />
              Recomandari
            </p>
            <p className="text-sm text-slate-200">{result.recomandari}</p>
          </div>
        </div>
      )}
    </div>
  );
}

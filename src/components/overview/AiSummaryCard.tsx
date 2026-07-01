"use client";

import { useState, useTransition } from "react";
import { Sparkles, RefreshCw, AlertTriangle, ArrowRight } from "lucide-react";
import { generateOpportunitySummaryAction } from "@/lib/actions/ai";
import type { OpportunitySummaryResult } from "@/lib/ai/prompts";

export function AiSummaryCard({ opportunityId }: { opportunityId: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<OpportunitySummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const res = await generateOpportunitySummaryAction(opportunityId);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.message ?? "Eroare necunoscuta.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 lg:col-span-2">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
          <Sparkles size={13} className="text-[#E8007A]" />
          Rezumat AI
        </p>
        <button
          onClick={handleGenerate}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/5 disabled:opacity-50"
        >
          {isPending ? (
            <>
              <RefreshCw size={12} className="animate-spin" />
              Se genereaza...
            </>
          ) : (
            <>
              <Sparkles size={12} />
              {result ? "Regenereaza" : "Genereaza rezumat"}
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-400">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!result && !error && !isPending && (
        <p className="py-4 text-center text-xs text-slate-500">
          Genereaza un rezumat al situatiei si o recomandare de pas urmator, bazate pe istoricul
          oportunitatii.
        </p>
      )}

      {result && (
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
              Context
            </p>
            <p className="text-sm text-slate-300">{result.rezumat}</p>
          </div>

          {result.blocaje && (
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Blocaje / riscuri
              </p>
              <p className="text-sm text-slate-300">{result.blocaje}</p>
            </div>
          )}

          <div className="rounded-lg border border-[#E8007A]/20 bg-[#E8007A]/5 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-[#E8007A]">
              <ArrowRight size={12} />
              Next best action
            </p>
            <p className="text-sm text-white">{result.next_best_action}</p>
            <p className="mt-1 text-xs text-slate-400">{result.motivatie}</p>
          </div>

          <p className="text-[10px] text-slate-600">
            Generat automat, pe baza istoricului curent. Verifica inainte de a actiona.
          </p>
        </div>
      )}
    </div>
  );
}

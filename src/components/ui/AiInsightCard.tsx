"use client";

import { useState, useTransition } from "react";
import { Sparkles, AlertTriangle, ListChecks, RefreshCw, History, ChevronDown, ChevronUp } from "lucide-react";
import type { FinancialInsightResult } from "@/lib/ai/financial-prompts";
import type { AiInsightHistoryRow } from "@/lib/actions/financial-ai";

export function AiInsightCard({
  title,
  generateAction,
  historyAction,
}: {
  title: string;
  generateAction: () => Promise<{ success: boolean; message?: string; data?: FinancialInsightResult }>;
  historyAction: () => Promise<{ success: boolean; message?: string; data?: AiInsightHistoryRow[] }>;
}) {
  const [isPending, startTransition] = useTransition();
  const [isHistoryPending, startHistoryTransition] = useTransition();
  const [result, setResult] = useState<FinancialInsightResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<AiInsightHistoryRow[] | null>(null);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const res = await generateAction();
      if (res.success && res.data) {
        setResult(res.data);
        setHistory(null); // se reincarca la urmatoarea deschidere, ca sa includa si generarea noua
      } else {
        setError(res.message ?? "Eroare la generare.");
      }
    });
  }

  function handleToggleHistory() {
    const next = !showHistory;
    setShowHistory(next);
    if (next && history === null) {
      startHistoryTransition(async () => {
        const res = await historyAction();
        setHistory(res.success && res.data ? res.data : []);
      });
    }
  }

  return (
    <div className="rounded-xl border border-[#E8007A]/20 bg-[#E8007A]/[0.03] p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-white">
          <Sparkles size={15} className="text-[#E8007A]" />
          {title}
        </p>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggleHistory}
            className="flex items-center gap-1 rounded-md border border-white/10 px-2 py-1.5 text-xs text-slate-400 transition hover:bg-white/5"
          >
            <History size={12} />
            Istoric
            {showHistory ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-md bg-[#E8007A] px-2.5 py-1.5 text-xs font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
          >
            {result ? <RefreshCw size={12} /> : <Sparkles size={12} />}
            {isPending ? "Se genereaza..." : result ? "Regenereaza" : "Genereaza interpretare"}
          </button>
        </div>
      </div>

      {error && <p className="mb-2 text-xs text-red-400">{error}</p>}

      {!result && !error && !isPending && (
        <p className="text-xs text-slate-500">
          Trimite un sumar al cifrelor curente catre Claude si primesti o interpretare - ce arata
          datele, ce riscuri sunt vizibile si ce ai putea face concret.
        </p>
      )}

      {isPending && <p className="text-xs text-slate-500">Se analizeaza datele curente...</p>}

      {result && <InsightBlock result={result} />}

      {showHistory && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Interpretari anterioare
          </p>
          {isHistoryPending && <p className="text-xs text-slate-500">Se incarca istoricul...</p>}
          {!isHistoryPending && history && history.length === 0 && (
            <p className="text-xs text-slate-500">Nicio interpretare salvata inca.</p>
          )}
          {!isHistoryPending && history && history.length > 0 && (
            <div className="max-h-96 space-y-3 overflow-y-auto">
              {history.map((h) => (
                <div key={h.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                  <p className="mb-2 text-[11px] text-slate-500">
                    {new Date(h.creat_la).toLocaleString("ro-RO")}
                  </p>
                  <InsightBlock result={h} compact />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InsightBlock({
  result,
  compact = false,
}: {
  result: { rezumat: string; riscuri: string; recomandari: string };
  compact?: boolean;
}) {
  const textSize = compact ? "text-xs" : "text-sm";
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">Rezumat</p>
        <p className={`${textSize} text-slate-200`}>{result.rezumat}</p>
      </div>
      <div>
        <p className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-amber-500">
          <AlertTriangle size={11} />
          Riscuri
        </p>
        <p className={`${textSize} text-slate-200`}>{result.riscuri}</p>
      </div>
      <div>
        <p className="mb-1 flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-green-500">
          <ListChecks size={11} />
          Recomandari
        </p>
        <p className={`${textSize} text-slate-200`}>{result.recomandari}</p>
      </div>
    </div>
  );
}

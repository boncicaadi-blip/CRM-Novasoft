"use client";

import { useState, useTransition } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { generateOpportunitySummaryAction } from "@/lib/actions/ai";

/**
 * Doar butonul de generare - rezultatul se salveaza direct ca intrare noua
 * in Timeline (vezi generateOpportunitySummaryAction), deci nu mai afisam
 * un chenar separat cu rezumatul; apare instant mai jos, in Timeline.
 */
export function AiSummaryCard({ opportunityId }: { opportunityId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const res = await generateOpportunitySummaryAction(opportunityId);
      if (!res.success) setError(res.message ?? "Eroare necunoscuta.");
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleGenerate}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-md border border-border-subtle px-2.5 py-1.5 text-xs font-medium text-text-primary transition hover:bg-surface-1 disabled:opacity-50"
      >
        {isPending ? (
          <>
            <RefreshCw size={12} className="animate-spin" />
            Se genereaza...
          </>
        ) : (
          <>
            <Sparkles size={12} className="text-[#E8007A]" />
            Genereaza rezumat AI
          </>
        )}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}

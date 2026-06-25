"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteOpportunityAction } from "@/lib/actions/opportunities";

export function DeleteButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-400">Sigur stergi?</span>
        <button
          onClick={() => startTransition(() => deleteOpportunityAction(id))}
          disabled={isPending}
          className="rounded-md bg-red-500/20 px-3 py-1.5 text-red-400 transition hover:bg-red-500/30"
        >
          {isPending ? "Se sterge..." : "Da, sterge"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-md px-3 py-1.5 text-slate-400 hover:bg-white/5"
        >
          Anuleaza
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-sm text-slate-400 transition hover:border-red-500/30 hover:text-red-400"
    >
      <Trash2 size={14} />
      Sterge
    </button>
  );
}

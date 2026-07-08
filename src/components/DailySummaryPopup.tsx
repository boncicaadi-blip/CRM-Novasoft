"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, AlertCircle, Clock, ArrowRight } from "lucide-react";
import { buildActionWorkItems } from "@/lib/analytics";
import { STAGE_COLORS } from "@/lib/constants";
import { formatEur } from "@/lib/format";
import type { Opportunity } from "@/types/opportunity";

const SESSION_KEY = "novasoft-daily-summary-shown";

/**
 * Popup cu rezumatul zilei (actiuni de azi + intarziate), afisat o singura
 * data per sesiune de browser - foloseste sessionStorage, care se reseteaza
 * automat la tab nou/inchidere browser, dar NU la navigare interna intre
 * pagini (asta ar fi enervant - userul a confirmat explicit ca vrea doar
 * o data per sesiune, nu la fiecare click).
 */
export function DailySummaryPopup({ opportunities }: { opportunities: Opportunity[] }) {
  // Initializare lazy: verificam sessionStorage direct la primul render,
  // fara setState intr-un effect (regula react-hooks/set-state-in-effect).
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem(SESSION_KEY);
  });

  useEffect(() => {
    if (open) {
      sessionStorage.setItem(SESSION_KEY, "1");
    }
    // Marcam "vazut" o singura data, la mount, daca popup-ul e deschis -
    // nu la fiecare schimbare ulterioara a lui `open` (ex. cand userul
    // inchide popup-ul, nu vrem sa rescriem aceeasi valoare inutil).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!open) return null;

  const azi = buildActionWorkItems(opportunities, "azi");
  const intarziate = buildActionWorkItems(opportunities, "intarziate");
  const total = azi.length + intarziate.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-xl border border-border-subtle bg-surface-1 shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-subtle p-4">
          <div>
            <p className="font-heading text-base text-text-primary">Buna dimineata!</p>
            <p className="text-xs text-text-muted">
              {total > 0
                ? `Ai ${total} ${total === 1 ? "actiune" : "actiuni"} de urmarit astazi.`
                : "Nimic de urmarit astazi - pipeline-ul e curat."}
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md p-1.5 text-text-muted transition hover:bg-surface-1 hover:text-text-primary"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-4">
          {intarziate.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-red-400">
                <AlertCircle size={13} />
                Intarziate ({intarziate.length})
              </p>
              <div className="space-y-1.5">
                {intarziate.slice(0, 5).map((item) => (
                  <SummaryRow key={item.opportunity.id} item={item.opportunity} />
                ))}
                {intarziate.length > 5 && (
                  <p className="px-1 text-[11px] text-text-muted">
                    +{intarziate.length - 5} mai multe
                  </p>
                )}
              </div>
            </div>
          )}

          {azi.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-[#0070F3]">
                <Clock size={13} />
                Azi ({azi.length})
              </p>
              <div className="space-y-1.5">
                {azi.slice(0, 5).map((item) => (
                  <SummaryRow key={item.opportunity.id} item={item.opportunity} />
                ))}
                {azi.length > 5 && (
                  <p className="px-1 text-[11px] text-text-muted">+{azi.length - 5} mai multe</p>
                )}
              </div>
            </div>
          )}

          {total === 0 && (
            <p className="py-6 text-center text-sm text-text-muted">
              Niciun lucru urgent - poti explora pipeline-ul liniștit.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border-subtle p-4">
          <Link
            href="/actiuni"
            onClick={() => setOpen(false)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#E8007A] py-2 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA]"
          >
            Vezi toate actiunile
            <ArrowRight size={14} />
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="rounded-md border border-border-subtle px-4 py-2 text-sm text-text-primary transition hover:bg-surface-1"
          >
            Inchide
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ item: o }: { item: Opportunity }) {
  const value = (o.forecast_total_saas ?? 0) + (o.forecast_total_onpremise ?? 0);
  return (
    <Link
      href={`/oportunitati/${o.id}`}
      className="flex items-center justify-between gap-2 rounded-md bg-surface-1 px-2.5 py-2 text-sm transition hover:bg-surface-1"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-text-primary">{o.nume_potential}</p>
        <div className="mt-0.5 flex items-center gap-1.5">
          <span
            className="rounded-full px-1.5 py-0.5 text-[10px]"
            style={{
              backgroundColor: `${STAGE_COLORS[o.stage] ?? "var(--text-secondary)"}20`,
              color: STAGE_COLORS[o.stage] ?? "var(--text-secondary)",
            }}
          >
            {o.stage}
          </span>
          <span className="truncate text-[11px] text-text-muted">{o.actiune}</span>
        </div>
      </div>
      {value > 0 && (
        <span className="shrink-0 font-mono text-[11px] text-[#E8007A]">{formatEur(value)}</span>
      )}
    </Link>
  );
}

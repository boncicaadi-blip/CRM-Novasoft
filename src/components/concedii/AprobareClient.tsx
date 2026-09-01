"use client";

import { MesajActiune } from "./MesajActiune";
import { useTransition, useState } from "react";
import { Check, X } from "lucide-react";
import { raspundeLaCerereAction } from "@/lib/actions/concedii";
import { TIP_CONCEDIU_LABELS, TIP_CONCEDIU_COLORS } from "@/types/concedii";
import type { Angajat, ConcediuCerere } from "@/types/concedii";

export function AprobareClient({
  cereriDeAprobat,
  istoricRaspunsuri,
  angajati,
}: {
  cereriDeAprobat: ConcediuCerere[];
  istoricRaspunsuri: ConcediuCerere[];
  angajati: Angajat[];
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [proceseDeja, setProceseDeja] = useState<Set<string>>(new Set());

  function handleRaspuns(cerereId: string, aprobat: boolean) {
    startTransition(async () => {
      const result = await raspundeLaCerereAction(cerereId, aprobat);
      setMessage(result.message);
      if (result.success) setProceseDeja((prev) => new Set(prev).add(cerereId));
    });
  }

  const numeAngajat = (id: string) => angajati.find((a) => a.id === id)?.nume ?? "—";

  return (
    <div>
      <h1 className="mb-1 text-lg font-heading text-text-primary">Aprobare cereri de concediu</h1>
      <p className="mb-4 text-xs text-text-secondary">
        {cereriDeAprobat.length} cereri in asteptare din partea echipei tale.
      </p>

      <MesajActiune message={message} />

      {cereriDeAprobat.length === 0 ? (
        <p className="mb-4 rounded-xl border border-border-subtle bg-surface-1 p-6 text-center text-sm text-text-secondary">
          Nicio cerere in asteptare.
        </p>
      ) : (
        <div className="mb-6 space-y-2">
          {cereriDeAprobat.map((c) => {
            const procesat = proceseDeja.has(c.id);
            return (
              <div
                key={c.id}
                className={`flex items-center justify-between rounded-xl border border-border-subtle bg-surface-1 p-3 ${
                  procesat ? "opacity-40" : ""
                }`}
              >
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: TIP_CONCEDIU_COLORS[c.tip] }} />
                    {numeAngajat(c.angajat_id)} — {TIP_CONCEDIU_LABELS[c.tip]}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {c.data_inceput} → {c.data_sfarsit} ({c.nr_zile} zile)
                    {c.observatii && ` · ${c.observatii}`}
                  </p>
                </div>
                {!procesat && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRaspuns(c.id, true)}
                      disabled={isPending}
                      className="flex items-center gap-1 rounded-md bg-[#22C55E]/15 px-2.5 py-1.5 text-xs font-medium text-[#22C55E] hover:bg-[#22C55E]/25 disabled:opacity-50"
                    >
                      <Check size={13} />
                      Aproba
                    </button>
                    <button
                      onClick={() => handleRaspuns(c.id, false)}
                      disabled={isPending}
                      className="flex items-center gap-1 rounded-md bg-red-500/15 px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/25 disabled:opacity-50"
                    >
                      <X size={13} />
                      Respinge
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {istoricRaspunsuri.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
            Raspunsuri recente
          </p>
          <div className="overflow-x-auto rounded-xl border border-border-subtle">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-1 text-left text-xs font-medium text-text-secondary">
                  <th className="px-3 py-2">Angajat</th>
                  <th className="px-3 py-2">Tip</th>
                  <th className="px-3 py-2">Interval</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {istoricRaspunsuri.map((c) => (
                  <tr key={c.id} className="border-b border-border-faint">
                    <td className="px-3 py-2 text-text-primary">{numeAngajat(c.angajat_id)}</td>
                    <td className="px-3 py-2 text-text-secondary">{TIP_CONCEDIU_LABELS[c.tip]}</td>
                    <td className="px-3 py-2 text-text-secondary">
                      {c.data_inceput} → {c.data_sfarsit}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          c.status === "aprobat" ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {c.status === "aprobat" ? "Aprobat" : "Respins"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Wallet, FileText, AlertTriangle, GitBranch, Truck } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CreantaDetailModal } from "./CreantaDetailModal";
import { formatRon } from "@/lib/format";
import { getCreantaStatus, getZileDepasire } from "@/lib/creante-analytics";
import type { Creanta, CreantaIncasare } from "@/types/creante";
import type { PartnerCrossLinks } from "@/lib/data/partners";

export function FisaClientClient({
  numeFirma,
  creante,
  incasari,
  crossLinks,
}: {
  numeFirma: string;
  creante: Creanta[];
  incasari: Record<string, CreantaIncasare[]>;
  crossLinks: PartnerCrossLinks;
}) {
  const [selected, setSelected] = useState<Creanta | null>(null);

  const summary = useMemo(() => {
    let totalFacturat = 0;
    let totalIncasat = 0;
    let soldTotal = 0;
    let nrRestante = 0;
    for (const c of creante) {
      totalFacturat += c.total_factura;
      totalIncasat += c.valoare_incasata;
      soldTotal += c.sold;
      if (c.sold > 0 && getCreantaStatus(c) === "restanta") nrRestante += 1;
    }
    return { totalFacturat, totalIncasat, soldTotal, nrRestante };
  }, [creante]);

  return (
    <div>
      <div className="mb-5">
        <p className="text-xs text-slate-500">Fisa client</p>
        <h1 className="text-lg font-heading text-white">{numeFirma}</h1>
        <p className="text-sm text-slate-500">{creante.length} facturi in total</p>
      </div>

      {(crossLinks.opportunityId || crossLinks.otherRoleSummary) && (
        <div className="mb-5 flex flex-wrap gap-3">
          {crossLinks.opportunityId && (
            <Link
              href={`/oportunitati/${crossLinks.opportunityId}`}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5"
            >
              <GitBranch size={15} className="text-[#0070F3]" />
              Are oportunitate in CRM
              {crossLinks.opportunityNume && (
                <span className="text-slate-500">— {crossLinks.opportunityNume}</span>
              )}
            </Link>
          )}
          {crossLinks.otherRoleSummary && (
            <Link
              href={`/obligatii/furnizor/${encodeURIComponent(numeFirma)}`}
              className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm text-amber-300 transition hover:bg-amber-500/10"
            >
              <Truck size={15} />
              Este si furnizor — {crossLinks.otherRoleSummary.count} facturi, sold{" "}
              {formatRon(crossLinks.otherRoleSummary.sold)}
            </Link>
          )}
        </div>
      )}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard
          label="Total facturat"
          value={formatRon(summary.totalFacturat)}
          icon={<FileText size={16} />}
          accent="#0070F3"
        />
        <KpiCard
          label="Total incasat"
          value={formatRon(summary.totalIncasat)}
          icon={<Wallet size={16} />}
          accent="#22C55E"
        />
        <KpiCard
          label="Sold restant"
          value={formatRon(summary.soldTotal)}
          icon={<Wallet size={16} />}
          accent="#F59E0B"
        />
        <KpiCard
          label="Facturi restante"
          value={String(summary.nrRestante)}
          icon={<AlertTriangle size={16} />}
          accent="#EF4444"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-left text-[11px] uppercase text-slate-500">
              <th className="px-3 py-2">Serviciu</th>
              <th className="px-3 py-2">Factura</th>
              <th className="px-3 py-2">Data factura</th>
              <th className="px-3 py-2">Scadenta</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Sold</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {creante.map((c) => {
              const status = getCreantaStatus(c);
              const zile = getZileDepasire(c);
              return (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="cursor-pointer border-b border-white/5 transition hover:bg-white/[0.03]"
                >
                  <td className="px-3 py-2 text-slate-400">{c.serviciu_facturat ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-400">{c.nr_factura}</td>
                  <td className="px-3 py-2 text-slate-400">
                    {c.data_factura ? new Date(c.data_factura).toLocaleDateString("ro-RO") : "—"}
                  </td>
                  <td className="px-3 py-2 text-slate-400">
                    {c.data_scadenta ? new Date(c.data_scadenta).toLocaleDateString("ro-RO") : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-slate-300">
                    {formatRon(c.total_factura)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-white">
                    {formatRon(c.sold)}
                  </td>
                  <td className="px-3 py-2">
                    {status === "incasata" ? (
                      <span className="text-green-400">Incasata</span>
                    ) : status === "restanta" ? (
                      <span className="text-red-400">Restanta ({zile}z)</span>
                    ) : (
                      <span className="text-slate-400">La zi</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {creante.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500">
                  Nicio factura pentru aceasta firma.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <CreantaDetailModal
          creanta={selected}
          incasari={incasari[selected.id] ?? []}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

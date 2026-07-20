"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Wallet, FileText, AlertTriangle, GitBranch, Building2 } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { ObligatieDetailModal } from "./ObligatieDetailModal";
import { formatRon } from "@/lib/format";
import { getObligatieStatus, getZileDepasireObligatie } from "@/lib/obligatii-analytics";
import { OBLIGATII_KPI_DEFINITIONS } from "@/lib/obligatii-kpi-definitions";
import type { Obligatie, ObligatiePlata } from "@/types/obligatii";
import type { PartnerCrossLinks } from "@/lib/data/partners";

export function FisaFurnizorClient({
  numeFurnizor,
  obligatii,
  plati,
  crossLinks,
  modalitatePlataOptions,
}: {
  numeFurnizor: string;
  obligatii: Obligatie[];
  plati: Record<string, ObligatiePlata[]>;
  crossLinks: PartnerCrossLinks;
  modalitatePlataOptions: string[];
}) {
  const [selected, setSelected] = useState<Obligatie | null>(null);

  const summary = useMemo(() => {
    let totalFacturat = 0;
    let totalPlatit = 0;
    let soldTotal = 0;
    let nrRestante = 0;
    for (const o of obligatii) {
      totalFacturat += o.total_factura;
      totalPlatit += o.valoare_platita;
      soldTotal += o.sold;
      if (o.sold > 0 && getObligatieStatus(o) === "restanta") nrRestante += 1;
    }
    return { totalFacturat, totalPlatit, soldTotal, nrRestante };
  }, [obligatii]);

  return (
    <div>
      <div className="mb-5">
        <p className="text-xs text-text-muted">Fisa furnizor</p>
        <h1 className="text-lg font-heading text-text-primary">{numeFurnizor}</h1>
        <p className="text-sm text-text-muted">{obligatii.length} facturi in total</p>
      </div>

      {(crossLinks.opportunityId || crossLinks.otherRoleSummary) && (
        <div className="mb-5 flex flex-wrap gap-3">
          {crossLinks.opportunityId && (
            <Link
              href={`/oportunitati/${crossLinks.opportunityId}`}
              className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-1 px-3 py-2 text-sm text-text-primary transition hover:bg-surface-1"
            >
              <GitBranch size={15} className="text-[#0070F3]" />
              Are oportunitate in CRM
              {crossLinks.opportunityNume && (
                <span className="text-text-muted">— {crossLinks.opportunityNume}</span>
              )}
            </Link>
          )}
          {crossLinks.otherRoleSummary && (
            <Link
              href={`/creante/client/${encodeURIComponent(numeFurnizor)}`}
              className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 text-sm text-blue-300 transition hover:bg-blue-500/10"
            >
              <Building2 size={15} />
              Este si client — {crossLinks.otherRoleSummary.count} facturi, sold{" "}
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
          definition={OBLIGATII_KPI_DEFINITIONS.totalFacturat}
        />
        <KpiCard
          label="Total platit"
          value={formatRon(summary.totalPlatit)}
          icon={<Wallet size={16} />}
          accent="#22C55E"
          definition={OBLIGATII_KPI_DEFINITIONS.totalPlatit}
        />
        <KpiCard
          label="Sold restant"
          value={formatRon(summary.soldTotal)}
          icon={<Wallet size={16} />}
          accent="#F59E0B"
          definition={OBLIGATII_KPI_DEFINITIONS.soldRestant}
        />
        <KpiCard
          label="Facturi restante"
          value={String(summary.nrRestante)}
          icon={<AlertTriangle size={16} />}
          accent="#EF4444"
          definition={OBLIGATII_KPI_DEFINITIONS.facturiRestante}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border-subtle">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-1 text-left text-[11px] uppercase text-text-muted">
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
            {obligatii.map((o) => {
              const status = getObligatieStatus(o);
              const zile = getZileDepasireObligatie(o);
              return (
                <tr
                  key={o.id}
                  onClick={() => setSelected(o)}
                  className="cursor-pointer border-b border-border-faint transition hover:bg-surface-1"
                >
                  <td className="px-3 py-2 text-text-secondary">{o.serviciu_facturat ?? "—"}</td>
                  <td className="px-3 py-2 text-text-secondary">{o.nr_factura}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {o.data_factura ? new Date(o.data_factura).toLocaleDateString("ro-RO") : "—"}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {o.data_scadenta ? new Date(o.data_scadenta).toLocaleDateString("ro-RO") : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-text-primary">
                    {formatRon(o.total_factura)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-text-primary">
                    {formatRon(o.sold)}
                  </td>
                  <td className="px-3 py-2">
                    {status === "platita" ? (
                      <span className="text-green-400">Platita</span>
                    ) : status === "restanta" ? (
                      <span className="text-red-400">Restanta ({zile}z)</span>
                    ) : (
                      <span className="text-text-secondary">La zi</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {obligatii.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-text-muted">
                  Nicio factura pentru acest furnizor.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <ObligatieDetailModal
          obligatie={selected}
          plati={plati[selected.id] ?? []}
          modalitatePlataOptions={modalitatePlataOptions}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

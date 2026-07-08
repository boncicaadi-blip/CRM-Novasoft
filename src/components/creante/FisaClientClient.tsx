"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Wallet, FileText, AlertTriangle, GitBranch, Truck } from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { CreantaDetailModal } from "./CreantaDetailModal";
import { formatRon } from "@/lib/format";
import { getCreantaStatus, getZileDepasire } from "@/lib/creante-analytics";
import { CREANTE_KPI_DEFINITIONS } from "@/lib/creante-kpi-definitions";
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
    let nrPromisiuniActive = 0;

    let sumaZileIntarziere = 0;
    let nrFacturiIncasateCuScadenta = 0;

    for (const c of creante) {
      totalFacturat += c.total_factura;
      totalIncasat += c.valoare_incasata;
      soldTotal += c.sold;
      if (c.sold > 0 && getCreantaStatus(c) === "restanta") nrRestante += 1;
      if (c.sold > 0 && c.data_promisa) nrPromisiuniActive += 1;

      // Comportament de plata: pentru facturile deja incasate integral, cat
      // de tarziu fata de scadenta a venit ULTIMA incasare care le-a inchis.
      if (c.sold <= 0 && c.data_scadenta) {
        const platiFactura = incasari[c.id] ?? [];
        if (platiFactura.length > 0) {
          const ultimaIncasare = platiFactura.reduce((max, p) => (p.data_incasare > max ? p.data_incasare : max), platiFactura[0].data_incasare);
          const scadenta = new Date(`${c.data_scadenta.slice(0, 10)}T00:00:00Z`);
          const incasat = new Date(`${ultimaIncasare.slice(0, 10)}T00:00:00Z`);
          const zile = Math.round((incasat.getTime() - scadenta.getTime()) / 86_400_000);
          sumaZileIntarziere += zile;
          nrFacturiIncasateCuScadenta += 1;
        }
      }
    }

    const mediePlataZile =
      nrFacturiIncasateCuScadenta > 0 ? Math.round(sumaZileIntarziere / nrFacturiIncasateCuScadenta) : null;

    return {
      totalFacturat,
      totalIncasat,
      soldTotal,
      nrRestante,
      nrPromisiuniActive,
      mediePlataZile,
      nrFacturiIncasateCuScadenta,
    };
  }, [creante, incasari]);

  return (
    <div>
      <div className="mb-5">
        <p className="text-xs text-text-muted">Fisa client</p>
        <h1 className="text-lg font-heading text-text-primary">{numeFirma}</h1>
        <p className="text-sm text-text-muted">{creante.length} facturi in total</p>
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
          definition={CREANTE_KPI_DEFINITIONS.totalFacturat}
        />
        <KpiCard
          label="Total incasat"
          value={formatRon(summary.totalIncasat)}
          icon={<Wallet size={16} />}
          accent="#22C55E"
          definition={CREANTE_KPI_DEFINITIONS.totalIncasat}
        />
        <KpiCard
          label="Sold restant"
          value={formatRon(summary.soldTotal)}
          icon={<Wallet size={16} />}
          accent="#F59E0B"
          definition={CREANTE_KPI_DEFINITIONS.soldRestant}
        />
        <KpiCard
          label="Facturi restante"
          value={String(summary.nrRestante)}
          icon={<AlertTriangle size={16} />}
          accent="#EF4444"
          definition={CREANTE_KPI_DEFINITIONS.facturiRestante}
        />
      </div>

      {(summary.mediePlataZile !== null || summary.nrPromisiuniActive > 0) && (
        <div className="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Comportament de plata
          </p>
          {summary.mediePlataZile !== null && (
            <span className="text-text-primary">
              In medie plateste{" "}
              <span
                className={`font-mono font-medium ${summary.mediePlataZile <= 0 ? "text-green-400" : "text-amber-400"}`}
              >
                {summary.mediePlataZile <= 0
                  ? `cu ${Math.abs(summary.mediePlataZile)} zile inainte de scadenta`
                  : `cu ${summary.mediePlataZile} zile dupa scadenta`}
              </span>{" "}
              <span className="text-text-muted">({summary.nrFacturiIncasateCuScadenta} facturi incasate)</span>
            </span>
          )}
          {summary.nrPromisiuniActive > 0 && (
            <span className="flex items-center gap-1.5 text-amber-400">
              {summary.nrPromisiuniActive} promisiune{summary.nrPromisiuniActive > 1 ? "i" : ""} de plata activa
              {summary.nrPromisiuniActive > 1 ? "e" : ""}
            </span>
          )}
        </div>
      )}

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
            {creante.map((c) => {
              const status = getCreantaStatus(c);
              const zile = getZileDepasire(c);
              return (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="cursor-pointer border-b border-border-faint transition hover:bg-surface-1"
                >
                  <td className="px-3 py-2 text-text-secondary">{c.serviciu_facturat ?? "—"}</td>
                  <td className="px-3 py-2 text-text-secondary">{c.nr_factura}</td>
                  <td className="px-3 py-2 text-text-secondary">
                    {c.data_factura ? new Date(c.data_factura).toLocaleDateString("ro-RO") : "—"}
                  </td>
                  <td className="px-3 py-2 text-text-secondary">
                    {c.data_scadenta ? new Date(c.data_scadenta).toLocaleDateString("ro-RO") : "—"}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-text-primary">
                    {formatRon(c.total_factura)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-text-primary">
                    {formatRon(c.sold)}
                  </td>
                  <td className="px-3 py-2">
                    {status === "incasata" ? (
                      <span className="text-green-400">Incasata</span>
                    ) : status === "restanta" ? (
                      <span className="text-red-400">Restanta ({zile}z)</span>
                    ) : (
                      <span className="text-text-secondary">La zi</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {creante.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-text-muted">
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

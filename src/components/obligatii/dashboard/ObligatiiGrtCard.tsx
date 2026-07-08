"use client";

import { Target } from "lucide-react";
import { formatRon } from "@/lib/format";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { OBLIGATII_KPI_DEFINITIONS } from "@/lib/obligatii-kpi-definitions";

const LUNI_RO = [
  "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
  "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie",
];

/** Doar afisare - targetul se calculeaza automat ca suma valorilor propuse
 * (facturi bifate "Propus spre plata"). */
export function ObligatiiGrtCard({
  monthKey,
  target,
  realizat,
}: {
  monthKey: string;
  target: number;
  realizat: number;
}) {
  const [an, luna] = monthKey.split("-");
  const labelLuna = `${LUNI_RO[Number(luna) - 1]} ${an}`;
  const grt = target > 0 ? (realizat / target) * 100 : null;
  const pct = grt !== null ? Math.min(100, Math.round(grt)) : 0;
  const barColor = grt === null ? "#475569" : grt >= 100 ? "#22C55E" : grt >= 70 ? "#FBBF24" : "#EF4444";

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
          <Target size={15} className="text-[#E8007A]" />
          GRT — {labelLuna}
          <InfoTooltip title="GRT (Grad Realizare Target)" definition={OBLIGATII_KPI_DEFINITIONS.grtCard} />
        </p>
        <p className="text-[11px] text-text-muted">Calculat automat din facturile propuse</p>
      </div>

      {target === 0 ? (
        <p className="py-2 text-xs text-text-muted">
          Niciun target pentru luna curenta inca - bifeaza facturi ca &quot;Propus spre plata&quot; in
          lista de Obligatii, ca sa vezi aici gradul de realizare.
        </p>
      ) : (
        <>
          <div className="mb-2 flex items-end justify-between">
            <div>
              <p className="font-mono text-2xl font-medium text-text-primary">
                {grt !== null ? `${Math.round(grt)}%` : "—"}
              </p>
              <p className="text-[11px] text-text-muted">
                {formatRon(realizat)} din {formatRon(target)}
              </p>
            </div>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-1">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${pct}%`, backgroundColor: barColor }}
            />
          </div>
        </>
      )}
    </div>
  );
}

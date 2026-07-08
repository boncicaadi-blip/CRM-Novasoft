"use client";

import { useMemo, useState, Fragment } from "react";
import { ChevronRight, ChevronDown, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { KpiInfoCard } from "@/components/ui/KpiInfoCard";
import { MonthMultiSelect } from "@/components/ui/MonthMultiSelect";
import { formatEur } from "@/lib/format";
import { KPI_DEFINITIONS } from "@/lib/kpi-definitions";
import { buildPlReport, type PlGrupValoare } from "@/lib/pl-analytics";
import type { VenitLinie } from "@/types/venituri";
import type { CheltuialaLinie } from "@/types/cheltuieli";

type PeriodFilter = "luna_curenta" | "ultimele_3_luni" | "anul_curent" | "toate" | "custom";

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "luna_curenta", label: "Luna curenta" },
  { value: "ultimele_3_luni", label: "Ultimele 3 luni" },
  { value: "anul_curent", label: "Anul curent" },
  { value: "toate", label: "Tot istoricul" },
  { value: "custom", label: "Perioada personalizata" },
];

function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function PlClient({
  venituriLinii,
  cheltuieliLinii,
  incadrareOrdine,
}: {
  venituriLinii: VenitLinie[];
  cheltuieliLinii: CheltuialaLinie[];
  incadrareOrdine: string[];
}) {
  const [period, setPeriod] = useState<PeriodFilter>("anul_curent");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customMonths, setCustomMonths] = useState<string[]>([]);
  const [showEstimat, setShowEstimat] = useState(true);
  const [showRealizat, setShowRealizat] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const { from, to } = useMemo(() => {
    const now = new Date();
    if (period === "luna_curenta") {
      const start = firstOfMonth(now);
      return { from: start, to: start };
    }
    if (period === "ultimele_3_luni") {
      return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to: firstOfMonth(now) };
    }
    if (period === "anul_curent") {
      return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear(), 11, 1) };
    }
    if (period === "custom" && customFrom && customTo) {
      return { from: firstOfMonth(new Date(customFrom)), to: firstOfMonth(new Date(customTo)) };
    }
    const toateLunile = [...venituriLinii.map((l) => l.luna), ...cheltuieliLinii.map((l) => l.luna)].sort();
    if (toateLunile.length === 0) return { from: firstOfMonth(now), to: firstOfMonth(now) };
    return { from: firstOfMonth(new Date(toateLunile[0])), to: firstOfMonth(new Date(toateLunile[toateLunile.length - 1])) };
  }, [period, customFrom, customTo, venituriLinii, cheltuieliLinii]);

  const report = useMemo(
    () => buildPlReport(venituriLinii, cheltuieliLinii, incadrareOrdine, from, to),
    [venituriLinii, cheltuieliLinii, incadrareOrdine, from, to]
  );

  const allGroupKeys = useMemo(
    () => ["VENITURI", ...report.costuriGrupe.map((g) => g.incadrare)],
    [report.costuriGrupe]
  );

  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function collapseAll() {
    setCollapsed(new Set(allGroupKeys));
  }
  function expandAll() {
    setCollapsed(new Set());
  }

  const nrColoane = (showEstimat ? 1 : 0) + (showRealizat ? 1 : 0);

  function renderGrupRows(grup: PlGrupValoare, isVenituri: boolean) {
    const isCollapsed = collapsed.has(grup.incadrare);
    const rows: React.ReactNode[] = [];

    rows.push(
      <tr key={grup.incadrare} className={`border-b border-border-subtle ${isVenituri ? "bg-green-500/[0.06]" : "bg-surface-2"}`}>
        <td className="sticky left-0 z-10 bg-inherit px-3 py-2">
          <button
            onClick={() => toggleGroup(grup.incadrare)}
            className="flex items-center gap-1.5 text-left text-sm font-medium text-text-primary"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            {grup.incadrare}
          </button>
        </td>
        {report.luni.map((luna) => (
          <Fragment key={luna.luna}>
            {showEstimat && (
              <td key={`${luna.luna}-e`} className="whitespace-nowrap px-3 py-2 text-right font-mono text-sm text-text-primary">
                {formatEur(grup.perLuna[luna.luna].estimat)}
              </td>
            )}
            {showRealizat && (
              <td key={`${luna.luna}-r`} className="whitespace-nowrap px-3 py-2 text-right font-mono text-sm text-text-primary">
                {formatEur(grup.perLuna[luna.luna].realizat)}
              </td>
            )}
          </Fragment>
        ))}
        {showEstimat && (
          <td className="whitespace-nowrap bg-surface-1 px-3 py-2 text-right font-mono text-sm font-medium text-text-primary">
            {formatEur(grup.totalEstimat)}
          </td>
        )}
        {showRealizat && (
          <td className="whitespace-nowrap bg-surface-1 px-3 py-2 text-right font-mono text-sm font-medium text-text-primary">
            {formatEur(grup.totalRealizat)}
          </td>
        )}
      </tr>
    );

    if (!isCollapsed) {
      for (const linie of grup.linii) {
        rows.push(
          <tr key={`${grup.incadrare}-${linie.clasa}`} className="border-b border-border-faint">
            <td className="sticky left-0 z-10 bg-surface-1 py-1.5 pl-8 pr-3 text-sm text-text-secondary">{linie.clasa}</td>
            {report.luni.map((luna) => (
              <Fragment key={luna.luna}>
                {showEstimat && (
                  <td key={`${luna.luna}-e`} className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-xs text-text-secondary">
                    {formatEur(linie.perLuna[luna.luna].estimat)}
                  </td>
                )}
                {showRealizat && (
                  <td key={`${luna.luna}-r`} className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-xs text-text-secondary">
                    {formatEur(linie.perLuna[luna.luna].realizat)}
                  </td>
                )}
              </Fragment>
            ))}
            {showEstimat && (
              <td className="whitespace-nowrap bg-surface-1 px-3 py-1.5 text-right font-mono text-xs text-text-primary">
                {formatEur(linie.totalEstimat)}
              </td>
            )}
            {showRealizat && (
              <td className="whitespace-nowrap bg-surface-1 px-3 py-1.5 text-right font-mono text-xs text-text-primary">
                {formatEur(linie.totalRealizat)}
              </td>
            )}
          </tr>
        );
      }
    }

    return rows;
  }

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-heading text-text-primary">P&amp;L detaliat</h1>
          <p className="text-sm text-text-muted">
            Venituri si costuri pe grupe (Incadrare) si linii (Clasa), calculate automat din Venituri/Cheltuieli. Editezi
            grupele/liniile din Setari → Nomenclatoare (Incadrare Cheltuieli / Clasa Cheltuieli).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={expandAll}
            className="rounded-md border border-border-subtle px-2.5 py-1.5 text-xs text-text-secondary hover:border-border-strong hover:text-text-primary"
          >
            Extinde tot
          </button>
          <button
            onClick={collapseAll}
            className="rounded-md border border-border-subtle px-2.5 py-1.5 text-xs text-text-secondary hover:border-border-strong hover:text-text-primary"
          >
            Restrange tot
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
          className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
        >
          {PERIOD_OPTIONS.map((p) => (
            <option key={p.value} value={p.value} style={{ backgroundColor: "var(--surface-1)" }}>
              {p.label}
            </option>
          ))}
        </select>
        {period === "custom" && (
          <>
            <MonthMultiSelect
              selected={customMonths}
              onChange={(months) => {
                setCustomMonths(months);
                if (months.length > 0) {
                  const sorted = [...months].sort();
                  setCustomFrom(`${sorted[0]}-01`);
                  const [y, m] = sorted[sorted.length - 1].split("-").map(Number);
                  setCustomTo(new Date(y, m, 0).toISOString().slice(0, 10));
                }
              }}
            />
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-xs text-text-primary outline-none focus:border-[#E8007A]"
            />
            <span className="text-xs text-text-muted">-</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-md border border-border-subtle bg-surface-2 px-2 py-1.5 text-xs text-text-primary outline-none focus:border-[#E8007A]"
            />
          </>
        )}

        <span className="mx-1 h-5 w-px bg-border-subtle" />

        <label className="flex items-center gap-1.5 rounded-md border border-border-subtle px-2.5 py-1.5 text-xs text-text-primary">
          <input
            type="checkbox"
            checked={showEstimat}
            onChange={(e) => setShowEstimat(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border-strong bg-surface-2"
          />
          Estimat
        </label>
        <label className="flex items-center gap-1.5 rounded-md border border-border-subtle px-2.5 py-1.5 text-xs text-text-primary">
          <input
            type="checkbox"
            checked={showRealizat}
            onChange={(e) => setShowRealizat(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-border-strong bg-surface-2"
          />
          Realizat
        </label>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KpiInfoCard
          label="Total Venituri"
          value={formatEur(showRealizat ? report.totalVenituri.totalRealizat : report.totalVenituri.totalEstimat)}
          sublabel={showEstimat && showRealizat ? `Estimat: ${formatEur(report.totalVenituri.totalEstimat)}` : undefined}
          icon={<TrendingUp size={16} />}
          accent="#22C55E"
          definition={KPI_DEFINITIONS.plTotalVenituri}
        />
        <KpiInfoCard
          label="Total Costuri"
          value={formatEur(showRealizat ? report.totalCosturi.totalRealizat : report.totalCosturi.totalEstimat)}
          sublabel={showEstimat && showRealizat ? `Estimat: ${formatEur(report.totalCosturi.totalEstimat)}` : undefined}
          icon={<TrendingDown size={16} />}
          accent="#F97316"
          definition={KPI_DEFINITIONS.plTotalCosturi}
        />
        <KpiInfoCard
          label="Profit"
          value={formatEur(showRealizat ? report.profit.totalRealizat : report.profit.totalEstimat)}
          sublabel={showEstimat && showRealizat ? `Estimat: ${formatEur(report.profit.totalEstimat)}` : undefined}
          icon={<Wallet size={16} />}
          accent="#0070F3"
          definition={KPI_DEFINITIONS.plProfit}
        />
      </div>

      {nrColoane === 0 ? (
        <p className="rounded-xl border border-border-subtle bg-surface-1 p-4 text-sm text-text-muted">
          Bifeaza cel putin Estimat sau Realizat ca sa vezi tabelul.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-1">
                <th className="sticky left-0 z-10 bg-surface-1 px-3 py-2 text-left text-xs font-medium text-text-muted">
                  Linie
                </th>
                {report.luni.map((luna) => (
                  <th
                    key={luna.luna}
                    colSpan={nrColoane}
                    className="border-l border-border-faint px-3 py-2 text-center text-xs font-medium text-text-muted"
                  >
                    {luna.label}
                  </th>
                ))}
                <th colSpan={nrColoane} className="border-l border-border-subtle bg-surface-2 px-3 py-2 text-center text-xs font-medium text-text-muted">
                  Total
                </th>
              </tr>
              <tr className="border-b border-border-subtle bg-surface-1">
                <th className="sticky left-0 z-10 bg-surface-1 px-3 py-1 text-left text-[10px] text-text-faint" />
                {report.luni.map((luna) => (
                  <Fragment key={luna.luna}>
                    {showEstimat && (
                      <th key={`${luna.luna}-e`} className="border-l border-border-faint px-3 py-1 text-right text-[10px] font-normal text-text-faint">
                        Estimat
                      </th>
                    )}
                    {showRealizat && (
                      <th key={`${luna.luna}-r`} className="px-3 py-1 text-right text-[10px] font-normal text-text-faint">
                        Realizat
                      </th>
                    )}
                  </Fragment>
                ))}
                {showEstimat && (
                  <th className="border-l border-border-subtle bg-surface-2 px-3 py-1 text-right text-[10px] font-normal text-text-faint">Estimat</th>
                )}
                {showRealizat && (
                  <th className="bg-surface-2 px-3 py-1 text-right text-[10px] font-normal text-text-faint">Realizat</th>
                )}
              </tr>
            </thead>
            <tbody>
              {renderGrupRows(report.venituri, true)}
              {report.costuriGrupe.map((grup) => renderGrupRows(grup, false))}
              <tr className="border-t-2 border-border-strong bg-surface-2 font-medium">
                <td className="sticky left-0 z-10 bg-surface-2 px-3 py-2 text-sm text-text-primary">PROFIT</td>
                {report.luni.map((luna) => (
                  <Fragment key={luna.luna}>
                    {showEstimat && (
                      <td
                        key={`${luna.luna}-e`}
                        className={`whitespace-nowrap px-3 py-2 text-right font-mono text-sm ${
                          report.profit.perLuna[luna.luna].estimat >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {formatEur(report.profit.perLuna[luna.luna].estimat)}
                      </td>
                    )}
                    {showRealizat && (
                      <td
                        key={`${luna.luna}-r`}
                        className={`whitespace-nowrap px-3 py-2 text-right font-mono text-sm ${
                          report.profit.perLuna[luna.luna].realizat >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {formatEur(report.profit.perLuna[luna.luna].realizat)}
                      </td>
                    )}
                  </Fragment>
                ))}
                {showEstimat && (
                  <td
                    className={`whitespace-nowrap bg-surface-1 px-3 py-2 text-right font-mono text-sm ${
                      report.profit.totalEstimat >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {formatEur(report.profit.totalEstimat)}
                  </td>
                )}
                {showRealizat && (
                  <td
                    className={`whitespace-nowrap bg-surface-1 px-3 py-2 text-right font-mono text-sm ${
                      report.profit.totalRealizat >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {formatEur(report.profit.totalRealizat)}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

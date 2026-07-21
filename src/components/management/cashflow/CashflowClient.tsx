"use client";

import { useMemo, useState, Fragment } from "react";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { KpiInfoCard } from "@/components/ui/KpiInfoCard";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { AiInsightCard } from "@/components/ui/AiInsightCard";
import { MonthMultiSelect } from "@/components/ui/MonthMultiSelect";
import { generateCashflowInsightAction, getAiInsightHistoryAction } from "@/lib/actions/financial-ai";
import { KPI_DEFINITIONS } from "@/lib/kpi-definitions";
import { formatRon } from "@/lib/format";
import { buildCashflowReport } from "@/lib/cashflow-analytics";
import type { Creanta, CreantaIncasare } from "@/types/creante";
import type { Obligatie, ObligatiePlata } from "@/types/obligatii";

type PeriodFilter = "luna_curenta" | "ultimele_3_luni" | "anul_curent" | "an" | "toate" | "custom";

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "luna_curenta", label: "Luna curenta" },
  { value: "ultimele_3_luni", label: "Ultimele 3 luni" },
  { value: "anul_curent", label: "Anul curent" },
  { value: "an", label: "An specific" },
  { value: "toate", label: "Tot istoricul" },
  { value: "custom", label: "Perioada personalizata" },
];

function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function CashflowClient({
  creante,
  creanteIncasari,
  obligatii,
  obligatiiPlati,
}: {
  creante: Creanta[];
  creanteIncasari: Record<string, CreantaIncasare[]>;
  obligatii: Obligatie[];
  obligatiiPlati: Record<string, ObligatiePlata[]>;
}) {
  const [period, setPeriod] = useState<PeriodFilter>("anul_curent");
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customMonths, setCustomMonths] = useState<string[]>([]);
  const [showEstimat, setShowEstimat] = useState(true);
  const [showRealizat, setShowRealizat] = useState(true);

  const toateDatele = useMemo(() => {
    const datesFromCreante = creante.map((c) => c.data_scadenta).filter((d): d is string => !!d);
    const datesFromObligatii = obligatii.map((o) => o.data_scadenta).filter((d): d is string => !!d);
    return [...datesFromCreante, ...datesFromObligatii].sort();
  }, [creante, obligatii]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const d of toateDatele) years.add(Number(d.slice(0, 4)));
    if (years.size === 0) years.add(new Date().getFullYear());
    return [...years].sort((a, b) => b - a);
  }, [toateDatele]);

  const effectiveSelectedYear = availableYears.includes(Number(selectedYear)) ? selectedYear : String(availableYears[0]);

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
    if (period === "an") {
      const y = Number(effectiveSelectedYear) || now.getFullYear();
      return { from: new Date(y, 0, 1), to: new Date(y, 11, 1) };
    }
    if (period === "custom" && customFrom && customTo) {
      return { from: firstOfMonth(new Date(customFrom)), to: firstOfMonth(new Date(customTo)) };
    }
    if (toateDatele.length === 0) return { from: firstOfMonth(now), to: firstOfMonth(now) };
    return { from: firstOfMonth(new Date(toateDatele[0])), to: firstOfMonth(new Date(toateDatele[toateDatele.length - 1])) };
  }, [period, effectiveSelectedYear, customFrom, customTo, toateDatele]);

  const report = useMemo(
    () => buildCashflowReport(creante, obligatii, creanteIncasari, obligatiiPlati, from, to),
    [creante, obligatii, creanteIncasari, obligatiiPlati, from, to]
  );

  const nrColoane = (showEstimat ? 1 : 0) + (showRealizat ? 1 : 0);

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-3 flex items-center gap-1.5">
        <h1 className="text-lg font-heading text-text-primary">Cashflow</h1>
        <InfoTooltip
          title="Cashflow"
          definition={{
            descriere:
              "Fluxul real de numerar - cand chiar intra/ies banii (Realizat: data incasarii/platii), spre deosebire de P&L, unde conteaza data facturii. Estimat = sold neincasat/neplatit, dupa scadenta. Facturile restante apar in prima luna afisata, ca sa nu dispara din calcul.",
            cumAnalizezi: "Click pe Estimat/Realizat pentru a vedea doar ce te intereseaza. Rosu = luna cu iesiri mai mari decat intrarile.",
          }}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
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
        {period === "an" && (
          <select
            value={effectiveSelectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
          >
            {availableYears.map((y) => (
              <option key={y} value={y} style={{ backgroundColor: "var(--surface-1)" }}>
                {y}
              </option>
            ))}
          </select>
        )}
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
          label="Incasari"
          value={formatRon(showRealizat ? report.totalRealizat.incasari : report.totalEstimat.incasari)}
          sublabel={showEstimat && showRealizat ? `Estimat: ${formatRon(report.totalEstimat.incasari)}` : undefined}
          icon={<TrendingUp size={16} />}
          accent="#22C55E"
          definition={KPI_DEFINITIONS.cashflowIncasari}
        />
        <KpiInfoCard
          label="Plati"
          value={formatRon(showRealizat ? report.totalRealizat.plati : report.totalEstimat.plati)}
          sublabel={showEstimat && showRealizat ? `Estimat: ${formatRon(report.totalEstimat.plati)}` : undefined}
          icon={<TrendingDown size={16} />}
          accent="#F97316"
          definition={KPI_DEFINITIONS.cashflowPlati}
        />
        <KpiInfoCard
          label="Cashflow Net"
          value={formatRon(showRealizat ? report.totalRealizat.net : report.totalEstimat.net)}
          valueColor={(showRealizat ? report.totalRealizat.net : report.totalEstimat.net) >= 0 ? "#22C55E" : "#EF4444"}
          sublabel={showEstimat && showRealizat ? `Estimat: ${formatRon(report.totalEstimat.net)}` : undefined}
          icon={<Wallet size={16} />}
          accent="#0070F3"
          definition={KPI_DEFINITIONS.cashflowNet}
        />
      </div>

      <div className="mb-4">
        <AiInsightCard
          title="Interpretare AI (Claude)"
          generateAction={generateCashflowInsightAction}
          historyAction={() => getAiInsightHistoryAction("cashflow_insight")}
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
                <th className="border-l border-border-subtle bg-surface-2 px-3 py-2 text-center text-xs font-medium text-text-muted">
                  Total
                </th>
              </tr>
              <tr className="border-b border-border-subtle bg-surface-1">
                <th className="sticky left-0 z-10 bg-surface-1 px-3 py-1 text-left text-[10px] text-text-faint" />
                {report.luni.map((luna) => (
                  <Fragment key={luna.luna}>
                    {showEstimat && (
                      <th className="border-l border-border-faint px-3 py-1 text-right text-[10px] font-normal text-text-faint">
                        Estimat
                      </th>
                    )}
                    {showRealizat && (
                      <th className="px-3 py-1 text-right text-[10px] font-normal text-text-faint">Realizat</th>
                    )}
                  </Fragment>
                ))}
                <th className="border-l border-border-subtle bg-surface-2 px-3 py-1 text-right text-[10px] font-normal text-text-faint">
                  {showRealizat ? "Realizat" : "Estimat"}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border-subtle bg-[#132420]">
                <td className="sticky left-0 z-10 bg-[#132420] px-3 py-2 text-sm font-medium text-text-primary">Incasari</td>
                {report.luni.map((luna) => (
                  <Fragment key={luna.luna}>
                    {showEstimat && (
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-sm text-text-primary">
                        {formatRon(report.estimat[luna.luna].incasari)}
                      </td>
                    )}
                    {showRealizat && (
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-sm text-text-primary">
                        {formatRon(report.realizat[luna.luna].incasari)}
                      </td>
                    )}
                  </Fragment>
                ))}
                <td className="whitespace-nowrap bg-surface-1 px-3 py-2 text-right font-mono text-sm font-medium text-text-primary">
                  {formatRon(showRealizat ? report.totalRealizat.incasari : report.totalEstimat.incasari)}
                </td>
              </tr>
              <tr className="border-b border-border-subtle bg-surface-2">
                <td className="sticky left-0 z-10 bg-surface-2 px-3 py-2 text-sm font-medium text-text-primary">Plati</td>
                {report.luni.map((luna) => (
                  <Fragment key={luna.luna}>
                    {showEstimat && (
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-sm text-text-primary">
                        {formatRon(report.estimat[luna.luna].plati)}
                      </td>
                    )}
                    {showRealizat && (
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-sm text-text-primary">
                        {formatRon(report.realizat[luna.luna].plati)}
                      </td>
                    )}
                  </Fragment>
                ))}
                <td className="whitespace-nowrap bg-surface-1 px-3 py-2 text-right font-mono text-sm font-medium text-text-primary">
                  {formatRon(showRealizat ? report.totalRealizat.plati : report.totalEstimat.plati)}
                </td>
              </tr>
              <tr className="border-t-2 border-border-strong bg-surface-2 font-medium">
                <td className="sticky left-0 z-10 bg-surface-2 px-3 py-2 text-sm text-text-primary">CASHFLOW NET</td>
                {report.luni.map((luna) => (
                  <Fragment key={luna.luna}>
                    {showEstimat && (
                      <td
                        className={`whitespace-nowrap px-3 py-2 text-right font-mono text-sm ${
                          report.estimat[luna.luna].net >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {formatRon(report.estimat[luna.luna].net)}
                      </td>
                    )}
                    {showRealizat && (
                      <td
                        className={`whitespace-nowrap px-3 py-2 text-right font-mono text-sm ${
                          report.realizat[luna.luna].net >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {formatRon(report.realizat[luna.luna].net)}
                      </td>
                    )}
                  </Fragment>
                ))}
                <td
                  className={`whitespace-nowrap bg-surface-1 px-3 py-2 text-right font-mono text-sm ${
                    (showRealizat ? report.totalRealizat.net : report.totalEstimat.net) >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {formatRon(showRealizat ? report.totalRealizat.net : report.totalEstimat.net)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

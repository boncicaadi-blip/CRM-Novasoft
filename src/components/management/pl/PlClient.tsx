"use client";

import { useMemo, useState, useEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import { ChevronRight, ChevronDown, TrendingUp, TrendingDown, Wallet, X } from "lucide-react";
import { KpiInfoCard } from "@/components/ui/KpiInfoCard";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { AiInsightCard } from "@/components/ui/AiInsightCard";
import { MonthMultiSelect } from "@/components/ui/MonthMultiSelect";
import { VenituriComponentaList } from "@/components/venituri/dashboard/VenituriComponentaList";
import { CheltuieliComponentaList } from "@/components/cheltuieli/dashboard/CheltuieliComponentaList";
import { generatePlInsightAction, getAiInsightHistoryAction } from "@/lib/actions/financial-ai";
import { formatEur } from "@/lib/format";
import { KPI_DEFINITIONS } from "@/lib/kpi-definitions";
import { buildPlReport, type PlGrupValoare } from "@/lib/pl-analytics";
import type { VenitLinie } from "@/types/venituri";
import type { CheltuialaLinie } from "@/types/cheltuieli";

type PeriodFilter = "luna_curenta" | "ultimele_3_luni" | "anul_curent" | "an" | "toate" | "custom";

const PERIOD_OPTIONS: { value: PeriodFilter; label: string }[] = [
  { value: "luna_curenta", label: "Luna curenta" },
  { value: "ultimele_3_luni", label: "Ultimele 3 luni" },
  { value: "anul_curent", label: "Anul curent" },
  { value: "an", label: "An specific" },
  { value: "toate", label: "Tot istoricul" },
  { value: "custom", label: "Perioada personalizata" },
];

type Selection =
  | { kind: "venit"; tipVenit: "Recurent" | "Nerecurent" | null; luna: string | null; label: string }
  | { kind: "cost"; incadrare: string; clasa: string | null; luna: string | null; label: string };

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
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customMonths, setCustomMonths] = useState<string[]>([]);
  const [showEstimat, setShowEstimat] = useState(true);
  const [showRealizat, setShowRealizat] = useState(true);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selection, setSelection] = useState<Selection | null>(null);
  const [mounted, setMounted] = useState(false);

  // Portalul (createPortal) are nevoie de document.body, disponibil doar
  // dupa montare in client.
  // eslint-disable-next-line react-hooks/set-state-in-effect -- vezi comentariul de mai sus
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!selection) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelection(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selection]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    for (const l of venituriLinii) years.add(Number(l.luna.slice(0, 4)));
    for (const l of cheltuieliLinii) years.add(Number(l.luna.slice(0, 4)));
    if (years.size === 0) years.add(new Date().getFullYear());
    return [...years].sort((a, b) => b - a);
  }, [venituriLinii, cheltuieliLinii]);

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
    const toateLunile = [...venituriLinii.map((l) => l.luna), ...cheltuieliLinii.map((l) => l.luna)].sort();
    if (toateLunile.length === 0) return { from: firstOfMonth(now), to: firstOfMonth(now) };
    return { from: firstOfMonth(new Date(toateLunile[0])), to: firstOfMonth(new Date(toateLunile[toateLunile.length - 1])) };
  }, [period, effectiveSelectedYear, customFrom, customTo, venituriLinii, cheltuieliLinii]);

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

  const selectionLinii = useMemo(() => {
    if (!selection) return [];
    const lunaSet = selection.luna ? new Set([selection.luna]) : new Set(report.luni.map((l) => l.luna));
    if (selection.kind === "venit") {
      return venituriLinii.filter(
        (l) => (selection.tipVenit === null || l.tip_venit === selection.tipVenit) && lunaSet.has(l.luna.slice(0, 7))
      );
    }
    return cheltuieliLinii.filter(
      (l) =>
        (l.incadrare || "ALTELE") === selection.incadrare &&
        (selection.clasa === null || (l.clasa || "Necategorizat") === selection.clasa) &&
        lunaSet.has(l.luna.slice(0, 7))
    );
  }, [selection, venituriLinii, cheltuieliLinii, report.luni]);

  const selectionTotals = useMemo(() => {
    if (!selection) return { estimat: 0, realizat: 0 };
    if (selection.kind === "venit") {
      const linii = selectionLinii as VenitLinie[];
      return {
        estimat: linii.reduce((s, l) => s + l.venit_estimat, 0),
        realizat: linii.reduce((s, l) => s + (l.venit_realizat ?? 0), 0),
      };
    }
    const linii = selectionLinii as CheltuialaLinie[];
    return {
      estimat: linii.reduce((s, l) => s + l.valoare_prognozata, 0),
      realizat: linii.reduce((s, l) => s + (l.valoare_realizata ?? 0), 0),
    };
  }, [selection, selectionLinii]);

  function AmountButton({ value, onClick }: { value: number; onClick: () => void }) {
    return (
      <button type="button" onClick={onClick} className="w-full text-right transition hover:text-[#E8007A] hover:underline">
        {formatEur(value)}
      </button>
    );
  }

  function renderGrupRows(grup: PlGrupValoare, isVenituri: boolean) {
    const isCollapsed = collapsed.has(grup.incadrare);
    const rows: React.ReactNode[] = [];

    const grupSelection = (luna: string | null): Selection => {
      if (isVenituri) {
        return { kind: "venit", tipVenit: null, luna, label: "VENITURI" };
      }
      return { kind: "cost", incadrare: grup.incadrare, clasa: null, luna, label: grup.incadrare };
    };

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
              <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-sm text-text-primary">
                <AmountButton value={grup.perLuna[luna.luna].estimat} onClick={() => setSelection(grupSelection(luna.luna))} />
              </td>
            )}
            {showRealizat && (
              <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-sm text-text-primary">
                <AmountButton value={grup.perLuna[luna.luna].realizat} onClick={() => setSelection(grupSelection(luna.luna))} />
              </td>
            )}
          </Fragment>
        ))}
        {showEstimat && (
          <td className="whitespace-nowrap bg-surface-1 px-3 py-2 text-right font-mono text-sm font-medium text-text-primary">
            <AmountButton value={grup.totalEstimat} onClick={() => setSelection(grupSelection(null))} />
          </td>
        )}
        {showRealizat && (
          <td className="whitespace-nowrap bg-surface-1 px-3 py-2 text-right font-mono text-sm font-medium text-text-primary">
            <AmountButton value={grup.totalRealizat} onClick={() => setSelection(grupSelection(null))} />
          </td>
        )}
      </tr>
    );

    if (!isCollapsed) {
      for (const linie of grup.linii) {
        const linieSelection = (luna: string | null): Selection => {
          if (isVenituri) {
            const tipVenit = linie.clasa === "Recurente" ? "Recurent" : "Nerecurent";
            return { kind: "venit", tipVenit, luna, label: linie.clasa };
          }
          return { kind: "cost", incadrare: grup.incadrare, clasa: linie.clasa, luna, label: `${grup.incadrare} · ${linie.clasa}` };
        };

        rows.push(
          <tr key={`${grup.incadrare}-${linie.clasa}`} className="border-b border-border-faint">
            <td className="sticky left-0 z-10 bg-surface-1 py-1.5 pl-8 pr-3 text-sm text-text-secondary">{linie.clasa}</td>
            {report.luni.map((luna) => (
              <Fragment key={luna.luna}>
                {showEstimat && (
                  <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-xs text-text-secondary">
                    <AmountButton value={linie.perLuna[luna.luna].estimat} onClick={() => setSelection(linieSelection(luna.luna))} />
                  </td>
                )}
                {showRealizat && (
                  <td className="whitespace-nowrap px-3 py-1.5 text-right font-mono text-xs text-text-secondary">
                    <AmountButton value={linie.perLuna[luna.luna].realizat} onClick={() => setSelection(linieSelection(luna.luna))} />
                  </td>
                )}
              </Fragment>
            ))}
            {showEstimat && (
              <td className="whitespace-nowrap bg-surface-1 px-3 py-1.5 text-right font-mono text-xs text-text-primary">
                <AmountButton value={linie.totalEstimat} onClick={() => setSelection(linieSelection(null))} />
              </td>
            )}
            {showRealizat && (
              <td className="whitespace-nowrap bg-surface-1 px-3 py-1.5 text-right font-mono text-xs text-text-primary">
                <AmountButton value={linie.totalRealizat} onClick={() => setSelection(linieSelection(null))} />
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
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <h1 className="text-lg font-heading text-text-primary">P&amp;L detaliat</h1>
          <InfoTooltip title="P&L detaliat" definition={KPI_DEFINITIONS.plPageHelp} />
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

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
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
          valueColor={(showRealizat ? report.profit.totalRealizat : report.profit.totalEstimat) >= 0 ? "#22C55E" : "#EF4444"}
          sublabel={showEstimat && showRealizat ? `Estimat: ${formatEur(report.profit.totalEstimat)}` : undefined}
          icon={<Wallet size={16} />}
          accent="#0070F3"
          definition={KPI_DEFINITIONS.plProfit}
        />
      </div>

      <div className="mb-4">
        <AiInsightCard
          title="Interpretare AI (Claude)"
          generateAction={generatePlInsightAction}
          historyAction={() => getAiInsightHistoryAction("pl_insight")}
        />
      </div>

      {nrColoane === 0 ? (
        <p className="rounded-xl border border-border-subtle bg-surface-1 p-4 text-sm text-text-muted">
          Bifeaza cel putin Estimat sau Realizat ca sa vezi tabelul.
        </p>
      ) : (
        <div className="mb-4 overflow-x-auto rounded-xl border border-border-subtle">
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
                    className="border-l border-border-faint bg-surface-1 px-3 py-2 text-center text-xs font-medium text-text-muted"
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
                      <th className="border-l border-border-faint bg-surface-1 px-3 py-1 text-right text-[10px] font-normal text-text-faint">
                        Estimat
                      </th>
                    )}
                    {showRealizat && (
                      <th className="bg-surface-1 px-3 py-1 text-right text-[10px] font-normal text-text-faint">Realizat</th>
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
                        className={`whitespace-nowrap px-3 py-2 text-right font-mono text-sm ${
                          report.profit.perLuna[luna.luna].estimat >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {formatEur(report.profit.perLuna[luna.luna].estimat)}
                      </td>
                    )}
                    {showRealizat && (
                      <td
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

      {mounted &&
        selection &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
            onClick={() => setSelection(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border-subtle bg-surface-1 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
                <p className="text-sm text-text-muted">
                  Compozitie: <span className="font-medium text-text-primary">{selection.label}</span>
                  {selection.luna && (
                    <span className="text-text-secondary"> · {report.luni.find((l) => l.luna === selection.luna)?.label}</span>
                  )}
                </p>
                <button
                  onClick={() => setSelection(null)}
                  title="Inchide (Esc)"
                  className="rounded-md p-1.5 text-text-muted transition hover:bg-surface-2 hover:text-text-primary"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="flex items-center gap-4 border-b border-border-subtle bg-surface-2 px-4 py-2.5 text-sm">
                {showEstimat && (
                  <p className="text-text-secondary">
                    Total estimat: <span className="font-mono font-medium text-text-primary">{formatEur(selectionTotals.estimat)}</span>
                  </p>
                )}
                {showRealizat && (
                  <p className="text-text-secondary">
                    Total realizat: <span className="font-mono font-medium text-text-primary">{formatEur(selectionTotals.realizat)}</span>
                  </p>
                )}
                <span className="ml-auto text-xs text-text-muted">{selectionLinii.length} inregistrari</span>
              </div>
              <div className="overflow-y-auto p-4">
                {selection.kind === "venit" ? (
                  <VenituriComponentaList linii={selectionLinii as VenitLinie[]} />
                ) : (
                  <CheltuieliComponentaList linii={selectionLinii as CheltuialaLinie[]} />
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

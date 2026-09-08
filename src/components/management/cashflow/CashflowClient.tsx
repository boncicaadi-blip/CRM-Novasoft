"use client";

import { useMemo, useState, useEffect, Fragment } from "react";
import { createPortal } from "react-dom";
import { TrendingUp, TrendingDown, Wallet, BarChart3, X } from "lucide-react";
import { KpiInfoCard } from "@/components/ui/KpiInfoCard";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { AiInsightCard } from "@/components/ui/AiInsightCard";
import { MonthMultiSelect } from "@/components/ui/MonthMultiSelect";
import { PlLineChart, type PlLineChartDatum } from "@/components/management/pl/PlLineChart";
import { CashflowCombinedChart } from "@/components/management/cashflow/CashflowCombinedChart";
import { CreanteComponentaList } from "@/components/creante/dashboard/CreanteComponentaList";
import { ObligatiiComponentaList } from "@/components/obligatii/dashboard/ObligatiiComponentaList";
import { CreantaDetailModal } from "@/components/creante/CreantaDetailModal";
import { ObligatieDetailModal } from "@/components/obligatii/ObligatieDetailModal";
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

type LinieCashflow = "incasari" | "plati" | "net";

interface CompozitieSelection {
  linie: "incasari" | "plati";
  luna: string | null;
  label: string;
}

interface ChartSelection {
  label: string;
  data: PlLineChartDatum[];
}

function AmountButton({ value, onClick }: { value: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full text-right transition hover:text-[#E8007A] hover:underline">
      {formatRon(value)}
    </button>
  );
}

function RowLabel({ label, onChartClick }: { label: string; onChartClick: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span>{label}</span>
      <button
        onClick={onChartClick}
        title="Vezi graficul acestei linii"
        className="shrink-0 text-text-secondary transition hover:text-[#E8007A]"
      >
        <BarChart3 size={13} />
      </button>
    </div>
  );
}

function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function CashflowClient({
  creante,
  creanteIncasari,
  obligatii,
  obligatiiPlati,
  modalitatePlataOptions,
}: {
  creante: Creanta[];
  creanteIncasari: Record<string, CreantaIncasare[]>;
  obligatii: Obligatie[];
  obligatiiPlati: Record<string, ObligatiePlata[]>;
  modalitatePlataOptions: string[];
}) {
  const [period, setPeriod] = useState<PeriodFilter>("anul_curent");
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [customMonths, setCustomMonths] = useState<string[]>([]);
  const [showEstimat, setShowEstimat] = useState(true);
  const [showRealizat, setShowRealizat] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [chartSelection, setChartSelection] = useState<ChartSelection | null>(null);
  const [compozitieSelection, setCompozitieSelection] = useState<CompozitieSelection | null>(null);
  const [selectedCreanta, setSelectedCreanta] = useState<Creanta | null>(null);
  const [selectedObligatie, setSelectedObligatie] = useState<Obligatie | null>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- portalul are nevoie de document.body, disponibil doar dupa montare in client
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!chartSelection && !compozitieSelection) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setChartSelection(null);
        setCompozitieSelection(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [chartSelection, compozitieSelection]);

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
  const primaLuna = report.luni[0]?.luna;

  const combinedChartData = report.luni.map((l) => ({
    label: l.label,
    incasari: showRealizat ? report.realizat[l.luna].incasari : report.estimat[l.luna].incasari,
    plati: showRealizat ? report.realizat[l.luna].plati : report.estimat[l.luna].plati,
    net: showRealizat ? report.realizat[l.luna].net : report.estimat[l.luna].net,
  }));

  const paymentCoverage =
    report.totalEstimat.plati > 0 ? (report.totalEstimat.incasari / report.totalEstimat.plati) * 100 : null;

  const luniNegative = report.luni.filter((l) =>
    (showRealizat ? report.realizat[l.luna].net : report.estimat[l.luna].net) < 0
  ).length;

  function chartData(linie: LinieCashflow): PlLineChartDatum[] {
    return report.luni.map((l) => ({
      label: l.label,
      estimat: report.estimat[l.luna][linie],
      realizat: report.realizat[l.luna][linie],
    }));
  }

  const compozitieItems = useMemo(() => {
    if (!compozitieSelection) return { creante: [] as Creanta[], obligatii: [] as Obligatie[] };
    const { linie, luna } = compozitieSelection;

    if (linie === "incasari") {
      if (luna === null) {
        // Total: toate facturile relevante in perioada (estimat: sold>0 cu scadenta in interval; realizat: cele cu incasare in interval)
        const idsCuIncasareInPerioada = new Set(
          Object.entries(creanteIncasari)
            .filter(([, lista]) => lista.some((i) => report.luni.some((l) => l.luna === i.data_incasare.slice(0, 7))))
            .map(([id]) => id)
        );
        return {
          creante: creante.filter((c) => (c.sold > 0 && c.data_scadenta) || idsCuIncasareInPerioada.has(c.id)),
          obligatii: [],
        };
      }
      const isFirstMonth = luna === primaLuna;
      return {
        creante: creante.filter((c) => {
          const inIncasari = (creanteIncasari[c.id] ?? []).some((i) => i.data_incasare.slice(0, 7) === luna);
          const scadentaKey = c.data_scadenta?.slice(0, 7);
          const inEstimat = c.sold > 0 && scadentaKey && (scadentaKey === luna || (isFirstMonth && scadentaKey < luna));
          return inIncasari || inEstimat;
        }),
        obligatii: [],
      };
    }

    // linie === "plati"
    if (luna === null) {
      const idsCuPlataInPerioada = new Set(
        Object.entries(obligatiiPlati)
          .filter(([, lista]) => lista.some((p) => report.luni.some((l) => l.luna === p.data_plata.slice(0, 7))))
          .map(([id]) => id)
      );
      return {
        creante: [],
        obligatii: obligatii.filter((o) => (o.sold > 0 && o.data_scadenta) || idsCuPlataInPerioada.has(o.id)),
      };
    }
    const isFirstMonth = luna === primaLuna;
    return {
      creante: [],
      obligatii: obligatii.filter((o) => {
        const inPlati = (obligatiiPlati[o.id] ?? []).some((p) => p.data_plata.slice(0, 7) === luna);
        const scadentaKey = o.data_scadenta?.slice(0, 7);
        const inEstimat = o.sold > 0 && scadentaKey && (scadentaKey === luna || (isFirstMonth && scadentaKey < luna));
        return inPlati || inEstimat;
      }),
    };
  }, [compozitieSelection, creante, obligatii, creanteIncasari, obligatiiPlati, report.luni, primaLuna]);

  return (
    <div className="px-4 py-4 sm:px-6 sm:py-6">
      <div className="mb-3 flex items-center gap-1.5">
        <h1 className="text-lg font-heading text-text-primary">Cashflow</h1>
        <InfoTooltip
          title="Cashflow"
          definition={{
            descriere:
              "Fluxul real de numerar - cand chiar intra/ies banii (Realizat: data incasarii/platii), spre deosebire de P&L, unde conteaza data facturii. Prognozat = sold neincasat/neplatit, dupa scadenta. Facturile restante apar in prima luna afisata, ca sa nu dispara din calcul.",
            cumAnalizezi: "Click pe orice suma pentru a vedea din ce se compune. Click pe iconita de grafic pentru evolutia acelei linii.",
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
          Prognozat
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
          sublabel={showEstimat && showRealizat ? `Prognozat: ${formatRon(report.totalEstimat.incasari)}` : undefined}
          icon={<TrendingUp size={16} />}
          accent="#22C55E"
          definition={KPI_DEFINITIONS.cashflowIncasari}
        />
        <KpiInfoCard
          label="Plati"
          value={formatRon(showRealizat ? report.totalRealizat.plati : report.totalEstimat.plati)}
          sublabel={showEstimat && showRealizat ? `Prognozat: ${formatRon(report.totalEstimat.plati)}` : undefined}
          icon={<TrendingDown size={16} />}
          accent="#F97316"
          definition={KPI_DEFINITIONS.cashflowPlati}
        />
        <KpiInfoCard
          label="Cashflow Net"
          value={formatRon(showRealizat ? report.totalRealizat.net : report.totalEstimat.net)}
          valueColor={(showRealizat ? report.totalRealizat.net : report.totalEstimat.net) >= 0 ? "#22C55E" : "#EF4444"}
          sublabel={showEstimat && showRealizat ? `Prognozat: ${formatRon(report.totalEstimat.net)}` : undefined}
          icon={<Wallet size={16} />}
          accent="#0070F3"
          definition={KPI_DEFINITIONS.cashflowNet}
        />
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <KpiInfoCard
          label="Payment Coverage"
          value={paymentCoverage !== null ? `${Math.round(paymentCoverage)}%` : "—"}
          valueColor={paymentCoverage !== null ? (paymentCoverage >= 100 ? "#22C55E" : "#EF4444") : undefined}
          sublabel="Incasari estimate / Plati estimate"
          icon={<Wallet size={16} />}
          accent="#0070F3"
          definition={KPI_DEFINITIONS.cashflowPaymentCoverage}
        />
        <KpiInfoCard
          label="Luni negative"
          value={String(luniNegative)}
          valueColor={luniNegative > 0 ? "#EF4444" : "#22C55E"}
          sublabel={`din ${report.luni.length} luni afisate`}
          icon={<TrendingDown size={16} />}
          accent="#F97316"
          definition={KPI_DEFINITIONS.cashflowLuniNegative}
        />
      </div>

      <div className="mb-4 rounded-xl border border-border-subtle bg-surface-1 p-4">
        <p className="mb-1 text-sm font-medium text-text-primary">Incasari vs. Plati vs. Cashflow Net</p>
        <p className="mb-3 text-[11px] text-text-muted">
          Arata valorile {showRealizat ? "Realizate" : "Prognozate"} pe fiecare luna din perioada selectata.
        </p>
        <CashflowCombinedChart data={combinedChartData} />
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
          Bifeaza cel putin Prognozat sau Realizat ca sa vezi tabelul.
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
                        Prognozat
                      </th>
                    )}
                    {showRealizat && (
                      <th className="px-3 py-1 text-right text-[10px] font-normal text-text-faint">Realizat</th>
                    )}
                  </Fragment>
                ))}
                <th className="border-l border-border-subtle bg-surface-2 px-3 py-1 text-right text-[10px] font-normal text-text-faint">
                  {showRealizat ? "Realizat" : "Prognozat"}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border-subtle bg-[#132420]">
                <td className="sticky left-0 z-10 bg-[#132420] px-3 py-2 text-sm font-medium text-text-primary">
                  <RowLabel label="Incasari" onChartClick={() => setChartSelection({ label: "Incasari", data: chartData("incasari") })} />
                </td>
                {report.luni.map((luna) => (
                  <Fragment key={luna.luna}>
                    {showEstimat && (
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-sm text-text-primary">
                        <AmountButton
                          value={report.estimat[luna.luna].incasari}
                          onClick={() => setCompozitieSelection({ linie: "incasari", luna: luna.luna, label: `Incasari · ${luna.label}` })}
                        />
                      </td>
                    )}
                    {showRealizat && (
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-sm text-text-primary">
                        <AmountButton
                          value={report.realizat[luna.luna].incasari}
                          onClick={() => setCompozitieSelection({ linie: "incasari", luna: luna.luna, label: `Incasari · ${luna.label}` })}
                        />
                      </td>
                    )}
                  </Fragment>
                ))}
                <td className="whitespace-nowrap bg-surface-1 px-3 py-2 text-right font-mono text-sm font-medium text-text-primary">
                  <AmountButton
                    value={showRealizat ? report.totalRealizat.incasari : report.totalEstimat.incasari}
                    onClick={() => setCompozitieSelection({ linie: "incasari", luna: null, label: "Incasari · toata perioada" })}
                  />
                </td>
              </tr>
              <tr className="border-b border-border-subtle bg-surface-2">
                <td className="sticky left-0 z-10 bg-surface-2 px-3 py-2 text-sm font-medium text-text-primary">
                  <RowLabel label="Plati" onChartClick={() => setChartSelection({ label: "Plati", data: chartData("plati") })} />
                </td>
                {report.luni.map((luna) => (
                  <Fragment key={luna.luna}>
                    {showEstimat && (
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-sm text-text-primary">
                        <AmountButton
                          value={report.estimat[luna.luna].plati}
                          onClick={() => setCompozitieSelection({ linie: "plati", luna: luna.luna, label: `Plati · ${luna.label}` })}
                        />
                      </td>
                    )}
                    {showRealizat && (
                      <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-sm text-text-primary">
                        <AmountButton
                          value={report.realizat[luna.luna].plati}
                          onClick={() => setCompozitieSelection({ linie: "plati", luna: luna.luna, label: `Plati · ${luna.label}` })}
                        />
                      </td>
                    )}
                  </Fragment>
                ))}
                <td className="whitespace-nowrap bg-surface-1 px-3 py-2 text-right font-mono text-sm font-medium text-text-primary">
                  <AmountButton
                    value={showRealizat ? report.totalRealizat.plati : report.totalEstimat.plati}
                    onClick={() => setCompozitieSelection({ linie: "plati", luna: null, label: "Plati · toata perioada" })}
                  />
                </td>
              </tr>
              <tr className="border-t-2 border-border-strong bg-surface-2 font-medium">
                <td className="sticky left-0 z-10 bg-surface-2 px-3 py-2 text-sm text-text-primary">
                  <RowLabel label="CASHFLOW NET" onChartClick={() => setChartSelection({ label: "CASHFLOW NET", data: chartData("net") })} />
                </td>
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

      {mounted &&
        chartSelection &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
            onClick={() => setChartSelection(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-xl border border-border-subtle bg-surface-1 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
                <p className="text-sm text-text-muted">
                  Grafic: <span className="font-medium text-text-primary">{chartSelection.label}</span>
                </p>
                <button
                  onClick={() => setChartSelection(null)}
                  title="Inchide (Esc)"
                  className="rounded-md p-1.5 text-text-muted transition hover:bg-surface-2 hover:text-text-primary"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4">
                <PlLineChart data={chartSelection.data} moneda="RON" />
              </div>
            </div>
          </div>,
          document.body
        )}

      {mounted &&
        compozitieSelection &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
            onClick={() => setCompozitieSelection(null)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border-subtle bg-surface-1 shadow-2xl"
            >
              <div className="flex items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
                <p className="text-sm text-text-muted">
                  Compozitie: <span className="font-medium text-text-primary">{compozitieSelection.label}</span>
                </p>
                <button
                  onClick={() => setCompozitieSelection(null)}
                  title="Inchide (Esc)"
                  className="rounded-md p-1.5 text-text-muted transition hover:bg-surface-2 hover:text-text-primary"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto p-4">
                {compozitieSelection.linie === "incasari" ? (
                  <CreanteComponentaList facturi={compozitieItems.creante} onSelect={setSelectedCreanta} />
                ) : (
                  <ObligatiiComponentaList facturi={compozitieItems.obligatii} onSelect={setSelectedObligatie} />
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

      {selectedCreanta && (
        <CreantaDetailModal
          creanta={selectedCreanta}
          incasari={creanteIncasari[selectedCreanta.id] ?? []}
          onClose={() => setSelectedCreanta(null)}
        />
      )}
      {selectedObligatie && (
        <ObligatieDetailModal
          obligatie={selectedObligatie}
          plati={obligatiiPlati[selectedObligatie.id] ?? []}
          modalitatePlataOptions={modalitatePlataOptions}
          onClose={() => setSelectedObligatie(null)}
        />
      )}
    </div>
  );
}

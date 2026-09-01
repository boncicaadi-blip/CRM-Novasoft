"use client";

import { useMemo, useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LabelList } from "recharts";
import { formatEur, formatEurCompact } from "@/lib/format";
import { ChartTooltipBox } from "@/components/dashboard/ChartTooltipBox";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { KPI_DEFINITIONS } from "@/lib/kpi-definitions";
import { computeMultiYearComparison, computeMonthByYearComparison, LUNI_LABELS } from "@/lib/pl-analytics";
import type { VenitLinie } from "@/types/venituri";

const CULORI_ANI = ["#94A3B8", "#0070F3", "#E8007A", "#22C55E", "#FBBF24", "#A855F7"];

function anKey(an: number) {
  return String(an);
}

export function MultiYearComparisonSection({ venituriLinii }: { venituriLinii: VenitLinie[] }) {
  const aniDisponibili = useMemo(() => {
    const ani = new Set(venituriLinii.map((l) => new Date(l.luna).getFullYear()));
    return Array.from(ani).sort((a, b) => a - b);
  }, [venituriLinii]);

  const anulCurent = new Date().getFullYear();
  const [aniSelectati, setAniSelectati] = useState<number[]>(() =>
    aniDisponibili.filter((a) => a >= anulCurent - 2)
  );
  const [luniSelectate, setLuniSelectate] = useState<number[]>([]);

  function toggleAn(an: number) {
    setAniSelectati((prev) => (prev.includes(an) ? prev.filter((a) => a !== an) : [...prev, an].sort((a, b) => a - b)));
  }
  function toggleLuna(luna: number) {
    setLuniSelectate((prev) => (prev.includes(luna) ? prev.filter((l) => l !== luna) : [...prev, luna].sort((a, b) => a - b)));
  }
  function toggleTrimestru(trimestru: number) {
    const luniTrimestru = [1, 2, 3].map((i) => (trimestru - 1) * 3 + i);
    const toateSelectate = luniTrimestru.every((l) => luniSelectate.includes(l));
    setLuniSelectate((prev) =>
      toateSelectate ? prev.filter((l) => !luniTrimestru.includes(l)) : Array.from(new Set([...prev, ...luniTrimestru])).sort((a, b) => a - b)
    );
  }

  const anData = useMemo(
    () => computeMultiYearComparison(venituriLinii, aniSelectati, luniSelectate),
    [venituriLinii, aniSelectati, luniSelectate]
  );
  const lunaAnData = useMemo(() => {
    const raw = computeMonthByYearComparison(venituriLinii, aniSelectati);
    return raw.map((d) => {
      const flat: Record<string, string | number> = { label: d.label };
      for (const an of aniSelectati) flat[anKey(an)] = d.valori[an] ?? 0;
      return flat;
    });
  }, [venituriLinii, aniSelectati]);

  return (
    <div className="mb-4 rounded-xl border border-border-subtle bg-surface-1 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-sm font-medium text-text-primary">
        Comparatie libera - ani si luni la alegere
        <InfoTooltip title="Comparatie multi-an" definition={KPI_DEFINITIONS.comparatieMultiAn} />
      </p>

      <div className="mb-4 flex flex-wrap items-start gap-6">
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">An</p>
          <div className="flex flex-wrap gap-1.5">
            {aniDisponibili.map((an) => (
              <button
                key={an}
                onClick={() => toggleAn(an)}
                className={`rounded-md border px-2.5 py-1 text-xs font-medium transition ${
                  aniSelectati.includes(an)
                    ? "border-[#E8007A] bg-[#E8007A]/15 text-[#E8007A]"
                    : "border-border-subtle text-text-secondary hover:border-border-strong"
                }`}
              >
                {an}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">Trimestru</p>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4].map((t) => (
              <button
                key={t}
                onClick={() => toggleTrimestru(t)}
                className="rounded-md border border-border-subtle px-2.5 py-1 text-xs font-medium text-text-secondary transition hover:border-border-strong"
              >
                Q{t}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
            Luna {luniSelectate.length > 0 && `(${luniSelectate.length} selectate - click pentru a reseta)`}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {LUNI_LABELS.map((label, i) => (
              <button
                key={label}
                onClick={() => toggleLuna(i + 1)}
                className={`rounded-md border px-2 py-1 text-xs font-medium transition ${
                  luniSelectate.includes(i + 1)
                    ? "border-[#0070F3] bg-[#0070F3]/15 text-[#0070F3]"
                    : "border-border-subtle text-text-secondary hover:border-border-strong"
                }`}
              >
                {label}
              </button>
            ))}
            {luniSelectate.length > 0 && (
              <button
                onClick={() => setLuniSelectate([])}
                className="rounded-md px-2 py-1 text-xs text-text-faint hover:text-text-secondary"
              >
                Toate lunile
              </button>
            )}
          </div>
        </div>
      </div>

      {aniSelectati.length === 0 ? (
        <p className="py-8 text-center text-xs text-text-muted">Selecteaza cel putin un an.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs text-text-muted">
              Total realizat pe an {luniSelectate.length > 0 && `(${luniSelectate.length} luni selectate)`}
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={anData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="an" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={(v) => formatEurCompact(v)} width={55} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as (typeof anData)[number];
                    return (
                      <ChartTooltipBox
                        title={String(d.an)}
                        rows={[
                          { label: "Realizat", value: formatEur(d.venituri) },
                          {
                            label: "Variatie vs an anterior din selectie",
                            value: d.variatieProcent === null ? "—" : `${d.variatieProcent >= 0 ? "+" : ""}${d.variatieProcent.toFixed(0)}%`,
                          },
                        ]}
                      />
                    );
                  }}
                />
                <Bar dataKey="venituri" fill="#E8007A" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  <LabelList
                    dataKey="variatieProcent"
                    position="top"
                    formatter={(v: unknown) => {
                      const n = v as number | null | undefined;
                      return n === null || n === undefined ? "" : `${n >= 0 ? "+" : ""}${n.toFixed(0)}%`;
                    }}
                    style={{ fill: "var(--text-secondary)", fontSize: 11 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <p className="mb-2 text-xs text-text-muted">Total realizat, pe luna si an</p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={lunaAnData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-secondary)" }} tickFormatter={(v) => formatEurCompact(Number(v))} width={55} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <ChartTooltipBox
                        title={String(label)}
                        rows={aniSelectati.map((an, i) => ({
                          label: String(an),
                          value: formatEur(Number(payload.find((p) => p.dataKey === anKey(an))?.value ?? 0)),
                          color: CULORI_ANI[i % CULORI_ANI.length],
                        }))}
                      />
                    );
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {aniSelectati.map((an, i) => (
                  <Line
                    key={an}
                    type="monotone"
                    dataKey={anKey(an)}
                    name={String(an)}
                    stroke={CULORI_ANI[i % CULORI_ANI.length]}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

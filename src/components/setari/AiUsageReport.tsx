"use client";

import { Sparkles, DollarSign, CheckCircle2, XCircle } from "lucide-react";
import type { AiUsageSummary, AiUsageRow } from "@/lib/data/ai-usage";
import { FEATURE_LABELS } from "@/lib/ai/feature-labels";

function usd(n: number): string {
  return `$${n.toFixed(4)}`;
}

export function AiUsageReport({ summary, rows }: { summary: AiUsageSummary; rows: AiUsageRow[] }) {
  return (
    <div>
      <div className="mb-5">
        <h1 className="flex items-center gap-2 text-lg font-heading text-text-primary">
          <Sparkles size={18} className="text-[#E8007A]" />
          Consum AI
        </h1>
        <p className="text-sm text-text-muted">
          Cate apeluri catre Claude s-au facut si cat au costat, pe fiecare functie din aplicatie.
          Vizibil doar administratorilor.
        </p>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="text-xs text-text-muted">Total apeluri</p>
          <p className="font-mono text-2xl font-medium text-text-primary">{summary.totalCalls}</p>
          <p className="mt-1 flex items-center gap-2 text-[11px] text-text-muted">
            <span className="flex items-center gap-1 text-green-400">
              <CheckCircle2 size={11} /> {summary.successCalls}
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <XCircle size={11} /> {summary.failedCalls}
            </span>
          </p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            <DollarSign size={13} />
            Cost total (estimat)
          </p>
          <p className="font-mono text-2xl font-medium text-text-primary">{usd(summary.totalCostUsd)}</p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="text-xs text-text-muted">Cost ultimele 30 de zile</p>
          <p className="font-mono text-2xl font-medium text-text-primary">{usd(summary.costLast30DaysUsd)}</p>
        </div>
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="text-xs text-text-muted">Apeluri ultimele 30 de zile</p>
          <p className="font-mono text-2xl font-medium text-text-primary">{summary.callsLast30Days}</p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="mb-3 text-sm font-medium text-text-primary">Cost pe functie</p>
          {summary.byFeature.length === 0 ? (
            <p className="text-xs text-text-muted">Niciun apel inregistrat inca.</p>
          ) : (
            <div className="space-y-2">
              {summary.byFeature.map((f) => (
                <div key={f.feature} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary">{f.feature}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-xs text-text-muted">{f.calls} apeluri</span>
                    <span className="font-mono text-text-primary">{usd(f.costUsd)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
          <p className="mb-3 text-sm font-medium text-text-primary">Ultimele 30 de zile cu activitate</p>
          {summary.byDay.length === 0 ? (
            <p className="text-xs text-text-muted">Niciun apel inregistrat inca.</p>
          ) : (
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {summary.byDay.map((d) => (
                <div key={d.day} className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary">{new Date(d.day).toLocaleDateString("ro-RO")}</span>
                  <span className="flex items-center gap-3">
                    <span className="text-text-muted">{d.calls} apeluri</span>
                    <span className="font-mono text-text-primary">{usd(d.costUsd)}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border-subtle">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-1 text-left text-[10px] uppercase text-text-muted">
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Functie</th>
              <th className="px-3 py-2">Model</th>
              <th className="px-3 py-2 text-right">Input</th>
              <th className="px-3 py-2 text-right">Output</th>
              <th className="px-3 py-2 text-right">Gandire</th>
              <th className="px-3 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border-faint">
                <td className="px-3 py-2 text-text-secondary">
                  {new Date(r.creat_la).toLocaleString("ro-RO")}
                </td>
                <td className="px-3 py-2 text-text-primary">{FEATURE_LABELS[r.feature] ?? r.feature}</td>
                <td className="px-3 py-2 text-text-muted">{r.model}</td>
                <td className="px-3 py-2 text-right font-mono text-text-secondary">{r.input_tokens}</td>
                <td className="px-3 py-2 text-right font-mono text-text-secondary">{r.output_tokens}</td>
                <td className="px-3 py-2 text-right font-mono text-text-muted">{r.thinking_tokens}</td>
                <td className="px-3 py-2 text-center">
                  {r.success ? (
                    <CheckCircle2 size={14} className="mx-auto text-green-400" />
                  ) : (
                    <XCircle size={14} className="mx-auto text-red-400" />
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-text-muted">
                  Niciun apel inregistrat inca.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-text-muted">
        Costul e estimat pe baza numarului de tokeni si a pretului cunoscut pentru fiecare model,
        la data apelului - poate diferi usor de factura reala Anthropic.
      </p>
    </div>
  );
}

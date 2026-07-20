"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Upload, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { importAnafFacturiAction, syncAnafFacturiAction } from "@/lib/actions/anaf-sync";
import type { AnafFactura } from "@/types/anaf";

type TipFilter = "toate" | "emisa" | "primita";
type StareFilter = "toate" | "noua" | "potrivita" | "importata";

const STARE_LABELS: Record<AnafFactura["stare"], { label: string; className: string }> = {
  noua: { label: "Noua", className: "bg-surface-2 text-text-secondary" },
  potrivita: { label: "Deja exista", className: "bg-amber-500/15 text-amber-500" },
  importata: { label: "Importata", className: "bg-green-500/15 text-green-400" },
  ignorata: { label: "Ignorata", className: "bg-surface-2 text-text-faint" },
};

function OpenArhivaButton({ storagePath }: { storagePath: string }) {
  const [isOpening, setIsOpening] = useState(false);

  async function handleOpen() {
    setIsOpening(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage.from("facturi-anaf").createSignedUrl(storagePath, 3600);
      if (error || !data) {
        alert("Nu am putut genera link-ul: " + (error?.message ?? "eroare necunoscuta"));
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <button
      onClick={handleOpen}
      disabled={isOpening}
      title="Deschide arhiva descarcata din SPV"
      className="rounded-md p-1.5 text-text-muted transition hover:bg-surface-2 hover:text-[#E8007A]"
    >
      <ExternalLink size={14} />
    </button>
  );
}

export function EFacturaClient({ facturi }: { facturi: AnafFactura[] }) {
  const router = useRouter();
  const [tipFilter, setTipFilter] = useState<TipFilter>("toate");
  const [stareFilter, setStareFilter] = useState<StareFilter>("toate");
  const [clientQuery, setClientQuery] = useState("");
  const [dataFrom, setDataFrom] = useState("");
  const [dataTo, setDataTo] = useState("");
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSync() {
    startTransition(async () => {
      const result = await syncAnafFacturiAction();
      setMessage(result.message);
      if (result.success) router.refresh();
    });
  }

  const filtered = useMemo(() => {
    return facturi.filter((f) => {
      if (tipFilter !== "toate" && f.tip !== tipFilter) return false;
      if (stareFilter !== "toate" && f.stare !== stareFilter) return false;
      if (clientQuery.trim()) {
        const q = clientQuery.trim().toLowerCase();
        const matches =
          (f.nume_partener ?? "").toLowerCase().includes(q) || (f.cui_partener ?? "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (dataFrom && f.data_factura && f.data_factura < dataFrom) return false;
      if (dataTo && f.data_factura && f.data_factura > dataTo) return false;
      return true;
    });
  }, [facturi, tipFilter, stareFilter, clientQuery, dataFrom, dataTo]);

  const selectabile = filtered.filter((f) => f.stare === "noua");

  function toggleAll() {
    setCheckedIds((prev) => {
      if (selectabile.every((f) => prev.has(f.id))) return new Set();
      return new Set(selectabile.map((f) => f.id));
    });
  }

  function toggleOne(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleImport() {
    if (checkedIds.size === 0) return;
    if (
      !confirm(
        `Imporți ${checkedIds.size} facturi? Cele "Emisa" merg in Creante, cele "Primita" merg in Obligatii, automat.`
      )
    )
      return;
    startTransition(async () => {
      const result = await importAnafFacturiAction(Array.from(checkedIds));
      setMessage(result.message);
      if (result.success) setCheckedIds(new Set());
    });
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-lg font-heading text-text-primary">E-Factura (SPV)</h1>
        <button
          onClick={handleSync}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
        >
          <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
          Sincronizeaza facturi
        </button>
      </div>
      <p className="mb-5 text-sm text-text-muted">
        Facturi descarcate automat din SPV. Selecteaza-le pe cele noi si importa-le in Creante (facturi emise) sau
        Obligatii (facturi primite) - conexiunea si sincronizarea se gestioneaza din Setari → Integrari.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select
          value={tipFilter}
          onChange={(e) => setTipFilter(e.target.value as TipFilter)}
          className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
        >
          <option value="toate" style={{ backgroundColor: "var(--surface-1)" }}>Toate tipurile</option>
          <option value="emisa" style={{ backgroundColor: "var(--surface-1)" }}>Emisa</option>
          <option value="primita" style={{ backgroundColor: "var(--surface-1)" }}>Primita</option>
        </select>
        <select
          value={stareFilter}
          onChange={(e) => setStareFilter(e.target.value as StareFilter)}
          className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
        >
          <option value="toate" style={{ backgroundColor: "var(--surface-1)" }}>Toate starile</option>
          <option value="noua" style={{ backgroundColor: "var(--surface-1)" }}>Noua</option>
          <option value="potrivita" style={{ backgroundColor: "var(--surface-1)" }}>Deja exista</option>
          <option value="importata" style={{ backgroundColor: "var(--surface-1)" }}>Importata</option>
        </select>
        <input
          value={clientQuery}
          onChange={(e) => setClientQuery(e.target.value)}
          placeholder="Cauta client/furnizor sau CIF..."
          className="min-w-[200px] flex-1 rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
        />
        <input
          type="date"
          value={dataFrom}
          onChange={(e) => setDataFrom(e.target.value)}
          className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
        />
        <span className="text-xs text-text-muted">-</span>
        <input
          type="date"
          value={dataTo}
          onChange={(e) => setDataTo(e.target.value)}
          className="rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
        />
      </div>

      {message && <p className="mb-3 text-xs text-text-muted">{message}</p>}

      {checkedIds.size > 0 && (
        <div className="mb-3">
          <button
            onClick={handleImport}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
          >
            <Upload size={14} />
            Importa {checkedIds.size} selectate (Creante/Obligatii, automat)
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border-subtle">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-1 text-left text-xs text-text-muted">
              <th className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={selectabile.length > 0 && selectabile.every((f) => checkedIds.has(f.id))}
                  onChange={toggleAll}
                  className="h-3.5 w-3.5 rounded border-border-strong bg-surface-2"
                />
              </th>
              <th className="px-3 py-2">Tip</th>
              <th className="px-3 py-2">Partener</th>
              <th className="px-3 py-2">CIF</th>
              <th className="px-3 py-2">Serviciu</th>
              <th className="px-3 py-2">Nr. factura</th>
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Scadenta</th>
              <th className="px-3 py-2 text-right">Valoare</th>
              <th className="px-3 py-2">Stare</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((f) => (
              <tr key={f.id} className="border-b border-border-faint hover:bg-surface-1">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={checkedIds.has(f.id)}
                    disabled={f.stare !== "noua"}
                    onChange={() => toggleOne(f.id)}
                    className="h-3.5 w-3.5 rounded border-border-strong bg-surface-2 disabled:opacity-30"
                  />
                </td>
                <td className="px-3 py-2 text-text-secondary">{f.tip === "emisa" ? "Emisa" : "Primita"}</td>
                <td className="px-3 py-2 text-text-primary">{f.nume_partener ?? "—"}</td>
                <td className="px-3 py-2 text-text-secondary">{f.cui_partener ?? "—"}</td>
                <td className="px-3 py-2 text-text-secondary">{f.serviciu ?? "—"}</td>
                <td className="px-3 py-2 text-text-secondary">{f.nr_factura ?? "—"}</td>
                <td className="px-3 py-2 text-text-secondary">{f.data_factura ?? "—"}</td>
                <td className="px-3 py-2 text-text-secondary">{f.data_scadenta ?? "—"}</td>
                <td className="px-3 py-2 text-right font-mono text-text-primary">
                  {f.valoare !== null ? `${f.valoare.toLocaleString("ro-RO")} ${f.moneda}` : "—"}
                </td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STARE_LABELS[f.stare].className}`}>
                    {STARE_LABELS[f.stare].label}
                  </span>
                </td>
                <td className="px-3 py-2">{f.storage_path && <OpenArhivaButton storagePath={f.storage_path} />}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-sm text-text-muted">
                  Nicio factura pentru filtrele curente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Link2, Unlink, RefreshCw, ExternalLink } from "lucide-react";
import {
  saveAnafClientCredentialsAction,
  getAnafAuthorizeUrlAction,
  disconnectAnafAction,
} from "@/lib/actions/anaf-efactura";
import { saveAnafCifAction, syncAnafFacturiAction } from "@/lib/actions/anaf-sync";
import { createClient } from "@/lib/supabase/client";
import type { AnafConnectionStatus, AnafFactura } from "@/types/anaf";

const ANAF_ERROR_MESSAGES: Record<string, string> = {
  cod_lipsa: "ANAF nu a trimis un cod de autorizare - incearca din nou.",
  client_id_lipsa: "Client ID/Secret nu sunt salvate - completeaza-le mai jos si incearca din nou.",
  schimb_token_esuat: "ANAF a refuzat schimbul de token. Verifica Client ID/Secret si Callback URL-ul din profilul OAuth.",
  salvare_esuata: "Token-ul a fost primit de la ANAF, dar salvarea in baza de date a esuat. Incearca din nou.",
  eroare_neasteptata: "A aparut o eroare neasteptata la conectare.",
};

const STARE_LABELS: Record<AnafFactura["stare"], { label: string; className: string }> = {
  noua: { label: "Noua", className: "bg-surface-2 text-text-secondary" },
  potrivita: { label: "Deja exista", className: "bg-amber-500/15 text-amber-500" },
  importata: { label: "Importata", className: "bg-green-500/15 text-green-400" },
  ignorata: { label: "Ignorata", className: "bg-surface-2 text-text-faint" },
};

function FacturaRow({ factura }: { factura: AnafFactura }) {
  const [isOpening, setIsOpening] = useState(false);

  async function handleOpen() {
    if (!factura.storage_path) return;
    setIsOpening(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage.from("facturi-anaf").createSignedUrl(factura.storage_path, 3600);
      if (error || !data) {
        alert("Nu am putut genera link-ul de descarcare: " + (error?.message ?? "eroare necunoscuta"));
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } finally {
      setIsOpening(false);
    }
  }

  return (
    <div className="flex items-center gap-2.5 rounded-md bg-surface-2 px-2.5 py-2 text-xs">
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STARE_LABELS[factura.stare].className}`}>
        {STARE_LABELS[factura.stare].label}
      </span>
      <span className="shrink-0 text-text-muted">{factura.tip === "emisa" ? "Emisa" : "Primita"}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-text-primary">
          {factura.nume_partener ?? factura.cui_partener ?? "Partener necunoscut"}
          {factura.nr_factura && ` · ${factura.nr_factura}`}
        </p>
        <p className="truncate text-[11px] text-text-muted">
          {factura.data_factura ?? "-"} · {factura.valoare !== null ? `${factura.valoare.toLocaleString("ro-RO")} ${factura.moneda}` : "-"}
        </p>
      </div>
      {factura.storage_path && (
        <button
          onClick={handleOpen}
          disabled={isOpening}
          title="Deschide arhiva descarcata din SPV"
          className="shrink-0 rounded-md p-1.5 text-text-muted transition hover:bg-surface-1 hover:text-[#E8007A]"
        >
          <ExternalLink size={14} />
        </button>
      )}
    </div>
  );
}

export function AnafConnectionCard({ status, facturi }: { status: AnafConnectionStatus; facturi: AnafFactura[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [cif, setCif] = useState(status.cif ?? "");

  const anafSuccess = searchParams.get("anaf_success");
  const anafError = searchParams.get("anaf_error");

  function handleSaveCredentials(formData: FormData) {
    startTransition(async () => {
      const result = await saveAnafClientCredentialsAction(formData);
      setMessage(result.message ?? null);
      if (result.success) router.refresh();
    });
  }

  function handleSaveCif(formData: FormData) {
    startTransition(async () => {
      const result = await saveAnafCifAction(formData);
      setMessage(result.message ?? null);
      if (result.success) router.refresh();
    });
  }

  function handleConnect() {
    startTransition(async () => {
      const result = await getAnafAuthorizeUrlAction();
      if (result.success) {
        window.location.href = result.url;
      } else {
        setMessage(result.message);
      }
    });
  }

  function handleDisconnect() {
    if (!confirm("Sigur deconectezi SPV? Va trebui sa reautorizezi cu certificatul digital pentru a reconecta.")) return;
    startTransition(async () => {
      const result = await disconnectAnafAction();
      if (result.success) router.refresh();
      else setMessage(result.message ?? null);
    });
  }

  function handleSync() {
    startTransition(async () => {
      const result = await syncAnafFacturiAction();
      setMessage(result.message);
      if (result.success) router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-sm font-medium text-text-primary">ANAF e-Factura (SPV)</p>
        {status.connected ? (
          <span className="flex items-center gap-1 rounded-full bg-green-500/15 px-2 py-0.5 text-[11px] text-green-400">
            <CheckCircle2 size={12} />
            Conectat
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-text-muted">
            <XCircle size={12} />
            Neconectat
          </span>
        )}
      </div>
      <p className="mb-4 text-xs text-text-muted">
        Pentru descarcarea automata a facturilor emise/primite din Spatiul Privat Virtual. Necesita certificatul
        digital calificat inregistrat in SPV, o singura data la conectare (si periodic, la reinnoire).
      </p>

      {anafSuccess && <p className="mb-3 rounded-md bg-green-500/10 px-3 py-2 text-xs text-green-400">Conectat cu succes la SPV.</p>}
      {anafError && (
        <p className="mb-3 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {ANAF_ERROR_MESSAGES[anafError] ?? "A aparut o eroare la conectare."}
        </p>
      )}
      {message && <p className="mb-3 text-xs text-text-muted">{message}</p>}

      {status.connected && (
        <div className="mb-4 grid grid-cols-2 gap-3 rounded-md bg-surface-2 p-3 text-xs">
          <div>
            <p className="text-text-muted">Conectat la</p>
            <p className="text-text-primary">{status.connectedAt ? new Date(status.connectedAt).toLocaleString("ro-RO") : "—"}</p>
          </div>
          <div>
            <p className="text-text-muted">Token expira la</p>
            <p className="text-text-primary">{status.expiresAt ? new Date(status.expiresAt).toLocaleDateString("ro-RO") : "—"}</p>
          </div>
        </div>
      )}

      <form action={handleSaveCredentials} className="mb-3 space-y-2">
        <div>
          <label className="mb-1 block text-[11px] text-text-muted">Client ID (din profilul OAuth ANAF)</label>
          <input
            name="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder={status.clientIdSet ? "•••••••• (deja salvat - completeaza doar ca sa schimbi)" : ""}
            className="w-full rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-text-muted">Client Secret</label>
          <input
            name="clientSecret"
            type="password"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
            placeholder={status.clientIdSet ? "•••••••• (deja salvat - completeaza doar ca sa schimbi)" : ""}
            className="w-full rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
          />
        </div>
        <button
          type="submit"
          disabled={isPending || !clientId || !clientSecret}
          className="rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-primary transition hover:border-border-strong disabled:opacity-40"
        >
          Salveaza Client ID / Secret
        </button>
      </form>

      <form action={handleSaveCif} className="mb-4 flex items-end gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-[11px] text-text-muted">CIF Novasoft (fara &quot;RO&quot;)</label>
          <input
            name="cif"
            value={cif}
            onChange={(e) => setCif(e.target.value)}
            placeholder="ex: 12345678"
            className="w-full rounded-md border border-border-subtle bg-surface-2 px-2.5 py-1.5 text-sm text-text-primary outline-none focus:border-[#E8007A]"
          />
        </div>
        <button
          type="submit"
          disabled={isPending || !cif}
          className="rounded-md border border-border-subtle px-3 py-1.5 text-xs font-medium text-text-primary transition hover:border-border-strong disabled:opacity-40"
        >
          Salveaza CIF
        </button>
      </form>

      <div className="mb-4 flex gap-2">
        {!status.connected ? (
          <button
            onClick={handleConnect}
            disabled={isPending || !status.clientIdSet}
            title={!status.clientIdSet ? "Salveaza mai intai Client ID / Secret" : "Te redirectioneaza la ANAF - ai nevoie de certificatul digital"}
            className="flex items-center gap-1.5 rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-40"
          >
            <Link2 size={14} />
            Conecteaza SPV
          </button>
        ) : (
          <>
            <button
              onClick={handleSync}
              disabled={isPending || !status.cif}
              title={!status.cif ? "Completeaza CIF-ul mai sus intai" : "Descarca facturile noi din ultimele 60 de zile"}
              className="flex items-center gap-1.5 rounded-md bg-[#E8007A] px-3 py-1.5 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-40"
            >
              <RefreshCw size={14} className={isPending ? "animate-spin" : ""} />
              Sincronizeaza facturi
            </button>
            <button
              onClick={handleDisconnect}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-md border border-red-500/20 px-3 py-1.5 text-sm text-red-400/80 transition hover:bg-red-500/10 hover:text-red-400"
            >
              <Unlink size={14} />
              Deconecteaza
            </button>
          </>
        )}
      </div>

      {facturi.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
            Facturi descarcate ({facturi.length})
          </p>
          <div className="max-h-80 space-y-1.5 overflow-y-auto pr-1">
            {facturi.map((f) => (
              <FacturaRow key={f.id} factura={f} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

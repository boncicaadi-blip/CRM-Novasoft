"use client";

import { useRef, useState, useTransition } from "react";
import { FileText, Upload, Trash2, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadOfertaAction, deleteOfertaAction } from "@/lib/actions/oferte";
import type { OpportunityOferta } from "@/types/opportunity";

function formatMarime(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function OfertaRow({ oferta, opportunityId }: { oferta: OpportunityOferta; opportunityId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const supabase = createClient();
  const publicUrl = supabase.storage.from("oferte").getPublicUrl(oferta.storage_path).data.publicUrl;

  return (
    <div className="flex items-center gap-2.5 rounded-md bg-surface-2 px-2.5 py-2">
      <span className="shrink-0 rounded-full bg-[#E8007A]/15 px-2 py-0.5 text-[11px] font-medium text-[#E8007A]">
        v{oferta.versiune}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-text-primary">{oferta.nume_fisier}</p>
        <p className="truncate text-[11px] text-text-muted">
          {new Date(oferta.creat_la).toLocaleDateString("ro-RO", { day: "2-digit", month: "short", year: "numeric" })}
          {oferta.profiles?.full_name && ` · ${oferta.profiles.full_name}`} · {formatMarime(oferta.marime_bytes)}
        </p>
      </div>
      <a
        href={publicUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Deschide PDF-ul"
        className="shrink-0 rounded-md p-1.5 text-text-muted transition hover:bg-surface-1 hover:text-[#E8007A]"
      >
        <ExternalLink size={14} />
      </a>
      {confirming ? (
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() =>
              startTransition(async () => {
                await deleteOfertaAction(oferta.id, opportunityId, oferta.storage_path);
                setConfirming(false);
              })
            }
            disabled={isPending}
            className="rounded-md bg-red-500/20 px-2 py-1 text-[11px] text-red-400 hover:bg-red-500/30"
          >
            {isPending ? "..." : "Sterge"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-md px-2 py-1 text-[11px] text-text-secondary hover:bg-surface-1"
          >
            Anuleaza
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirming(true)}
          title="Sterge aceasta oferta"
          className="shrink-0 rounded-md p-1.5 text-text-muted transition hover:bg-surface-1 hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

export function OferteCard({ opportunityId, oferte }: { opportunityId: string; oferte: OpportunityOferta[] }) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleUpload() {
    if (!selectedFile) return;
    setError(null);
    const formData = new FormData();
    formData.set("file", selectedFile);
    startTransition(async () => {
      const result = await uploadOfertaAction(opportunityId, formData);
      if (result.success) {
        setSelectedFile(null);
        if (inputRef.current) inputRef.current.value = "";
      } else {
        setError(result.message ?? "A aparut o eroare la incarcare.");
      }
    });
  }

  const nextVersion = (oferte[0]?.versiune ?? 0) + 1;

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-text-muted">
          <FileText size={13} />
          Oferte atasate
        </p>
        <span className="rounded-full bg-surface-2 px-1.5 py-0.5 text-[11px] text-text-secondary">{oferte.length}</span>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          className="min-w-0 flex-1 text-xs text-text-secondary file:mr-2 file:rounded-md file:border-0 file:bg-surface-2 file:px-2.5 file:py-1.5 file:text-xs file:text-text-primary hover:file:bg-surface-1"
        />
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isPending}
          title={selectedFile ? `Ataseaza ca versiunea ${nextVersion}` : "Selecteaza un PDF"}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-[#E8007A] px-3 py-1.5 text-xs font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-40"
        >
          <Upload size={13} />
          {isPending ? "Se incarca..." : `Ataseaza v${nextVersion}`}
        </button>
      </div>
      {error && <p className="mb-3 text-[11px] text-red-400">{error}</p>}

      {oferte.length === 0 ? (
        <p className="py-3 text-center text-xs text-text-muted">Nicio oferta atasata inca.</p>
      ) : (
        <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
          {oferte.map((o) => (
            <OfertaRow key={o.id} oferta={o} opportunityId={opportunityId} />
          ))}
        </div>
      )}
    </div>
  );
}

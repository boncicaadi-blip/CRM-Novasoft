"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { createPartnerAction } from "@/lib/actions/parteneri-admin";

const inputClass =
  "w-full rounded-md border border-border-subtle bg-surface-2 px-2.5 py-2 text-sm text-text-primary outline-none focus:border-[#E8007A]";
const labelClass = "mb-1 block text-[11px] text-text-muted";

export function AddPartnerModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nume, setNume] = useState("");
  const [codFiscal, setCodFiscal] = useState("");
  const [facturabil, setFacturabil] = useState(false);
  const [esteFurnizor, setEsteFurnizor] = useState(false);
  const [potential, setPotential] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function handleSave() {
    setMessage(null);
    if (!nume.trim()) {
      setMessage("Numele este obligatoriu.");
      return;
    }
    startTransition(async () => {
      const result = await createPartnerAction({
        nume,
        cod_fiscal: codFiscal || null,
        facturabil,
        este_furnizor: esteFurnizor,
        potential,
      });
      if (result.success) {
        router.refresh();
        onClose();
      } else {
        setMessage(result.message ?? "Eroare la salvare.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-border-subtle bg-surface-1 p-5"
      >
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-heading text-text-primary">Adauga partener nou</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className={labelClass}>Nume *</label>
            <input value={nume} onChange={(e) => setNume(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>CIF</label>
            <input value={codFiscal} onChange={(e) => setCodFiscal(e.target.value)} className={inputClass} />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={facturabil}
                onChange={(e) => setFacturabil(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border-strong bg-surface-2"
              />
              Client
            </label>
            <label className="flex items-center gap-1.5 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={esteFurnizor}
                onChange={(e) => setEsteFurnizor(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border-strong bg-surface-2"
              />
              Furnizor
            </label>
            <label className="flex items-center gap-1.5 text-sm text-text-primary">
              <input
                type="checkbox"
                checked={potential}
                onChange={(e) => setPotential(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border-strong bg-surface-2"
              />
              Potential
            </label>
          </div>
          <p className="text-[10px] text-text-faint">
            Client = apare in dropdown-ul de clienti la Creante/Venituri. Furnizor = apare in dropdown-ul de
            furnizori la adaugarea manuala de Obligatii. Potential = prospect/lead, inca nu client sau furnizor.
            Poti bifa oricare combinatie.
          </p>
        </div>

        {message && <p className="mt-3 text-xs text-amber-400">{message}</p>}

        <button
          onClick={handleSave}
          disabled={isPending}
          className="mt-4 w-full rounded-md bg-[#E8007A] py-2 text-sm font-medium text-[#0B0D1A] transition hover:bg-[#FF4FAA] disabled:opacity-50"
        >
          {isPending ? "Se salveaza..." : "Salveaza"}
        </button>
      </div>
    </div>
  );
}

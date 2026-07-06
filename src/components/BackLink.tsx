"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Ca BackButton, dar cu text vizibil (nu doar iconita) - pentru locuri unde
 * un text descriptiv ("Inapoi la pipeline") era util, dar trebuie sa
 * foloseasca tot istoricul browserului (router.back()), nu o ruta fixa -
 * altfel "inapoi" nu chiar te duce inapoi, daca ai ajuns pe pagina din alta
 * parte decat ruta presupusa.
 */
export function BackLink({ label }: { label: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-white"
    >
      <ArrowLeft size={13} />
      {label}
    </button>
  );
}

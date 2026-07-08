"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/**
 * Buton universal de "inapoi". Randat in fluxul normal al paginii (nu mai
 * fixed) - fiecare pagina il pune intr-un rand flex, langa titlu, ca sa nu
 * se mai suprapuna niciodata cu textul, indiferent de layout.
 */
export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      title="Inapoi"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-surface-1 text-text-secondary shadow-lg transition hover:bg-surface-2 hover:text-text-primary"
    >
      <ArrowLeft size={15} />
    </button>
  );
}

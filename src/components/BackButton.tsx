"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

/** Buton universal de "inapoi", flotant, vizibil peste orice pagina. */
export function BackButton() {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      title="Inapoi"
      className="fixed left-3 top-16 z-40 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-[#111535] text-slate-400 shadow-lg transition hover:bg-white/10 hover:text-white md:left-[15.5rem] md:top-4"
    >
      <ArrowLeft size={15} />
    </button>
  );
}

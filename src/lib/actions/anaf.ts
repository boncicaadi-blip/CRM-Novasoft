"use server";

import { fetchAnafCompanyInfo } from "@/lib/anaf";

/**
 * Cauta date de identificare ale firmei dupa CUI - nume, judet, oras,
 * domeniu de activitate (CAEN). Folosit in formularul de "Oportunitate
 * noua" pentru auto-completare la introducerea codului fiscal.
 *
 * Nota: nu include cifra de afaceri/nr angajati - cheia Termene.ro
 * configurata nu are acces la categoria "Date financiare" (vezi discutia
 * cu userul - ramane de completat manual pana cand se activeaza acea
 * categorie pe cont).
 */
export async function lookupAnafCompanyAction(cui: string) {
  const { data, error } = await fetchAnafCompanyInfo(cui);

  if (!data) {
    return { success: false as const, error };
  }

  return {
    success: true as const,
    denumire: data.denumire,
    judet: data.judet,
    oras: data.oras,
    domeniulActivitate: data.domeniulActivitate,
  };
}

"use server";

import { fetchAnafCompanyInfo } from "@/lib/anaf";
import { createClient } from "@/lib/supabase/server";

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
  // Datele sunt oricum publice (acelasi lucru il obtii direct de pe ANAF),
  // dar cerem totusi un user autentificat, ca sa nu expunem un apel gratuit
  // catre API-ul extern oricui nimereste peste actiune.
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) {
    return { success: false as const, error: "Trebuie sa fii autentificat." };
  }

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

"use server";

import { fetchAnafCompanyInfo } from "@/lib/anaf";
import { createClient } from "@/lib/supabase/server";

/**
 * Cauta date de identificare ale firmei dupa CUI - nume, judet, oras,
 * cod CAEN. Folosit in formularul de "Oportunitate noua" pentru
 * auto-completare la introducerea codului fiscal.
 *
 * Sursa: ANAF (serviciul public de verificare TVA), gratuit, fara cont.
 * Nu include cifra de afaceri/nr angajati - pentru astea vezi Fisa
 * Partenerului ("Preia date financiare (ANAF)"), care foloseste bilanturile
 * publice, o sursa separata de la ANAF.
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

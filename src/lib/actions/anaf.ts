"use server";

import { revalidatePath } from "next/cache";
import { fetchAnafFinancials, fetchAnafCompanyInfo } from "@/lib/anaf";
import { updateOpportunity } from "@/lib/data/opportunities";

/**
 * Actualizeaza cifra de afaceri (din ultimul bilant disponibil) pentru o
 * oportunitate existenta, pe baza cod_fiscal. Apelat manual din fisa
 * oportunitatii ("Actualizeaza din ANAF").
 */
export async function refreshAnafFinancialsAction(opportunityId: string, cui: string) {
  const data = await fetchAnafFinancials(cui);
  if (!data) {
    return {
      success: false,
      message:
        "Eroare la conectarea cu Termene.ro. Verifica daca ai completat credentialele in Setari -> Integrari (click pe avatarul tau din meniu).",
    };
  }
  if (data.cifraAfaceri === null) {
    return { success: false, message: `Nu am gasit date financiare pentru acest CUI${data.numeFirma ? ` (${data.numeFirma})` : ""}.` };
  }

  await updateOpportunity(opportunityId, {
    cifra_afaceri: data.cifraAfaceri,
    cifra_afaceri_an: data.an,
    cifra_afaceri_actualizat_la: new Date().toISOString(),
    nr_angajati: data.numarAngajati ?? undefined,
  });

  revalidatePath(`/oportunitati/${opportunityId}`);
  return { success: true, message: `Cifra de afaceri actualizata (${data.an ?? "an necunoscut"}).` };
}

/**
 * Cauta date generale ale firmei dupa CUI - folosit in formularul de
 * "Oportunitate noua" pentru auto-completare la introducerea codului fiscal.
 * Nu scrie nimic, doar returneaza datele gasite.
 */
export async function lookupAnafCompanyAction(cui: string) {
  const [info, financials] = await Promise.all([
    fetchAnafCompanyInfo(cui),
    fetchAnafFinancials(cui),
  ]);

  if (!info && !financials) {
    return { success: false as const };
  }

  return {
    success: true as const,
    denumire: info?.denumire ?? null,
    judet: info?.judet ?? null,
    oras: info?.oras ?? null,
    cifraAfaceri: financials?.cifraAfaceri ?? null,
    an: financials?.an ?? null,
  };
}

import { createClient } from "@/lib/supabase/server";
import { normalizeName } from "@/lib/normalizeName";

export interface PartnerCrossLinks {
  opportunityId: string | null;
  opportunityNume: string | null;
  /** Sumarul din CEALALTA parte (Obligatii cand esti pe Fisa Client, Creante
   * cand esti pe Fisa Furnizor) - null daca firma nu apare si acolo. */
  otherRoleSummary: { sold: number; count: number } | null;
}

const EMPTY_LINKS: PartnerCrossLinks = {
  opportunityId: null,
  opportunityNume: null,
  otherRoleSummary: null,
};

/** Pentru Fisa Client: cauta daca aceeasi firma are si o oportunitate CRM
 * sau apare si ca furnizor (Obligatii). */
export async function getClientCrossLinks(numeFirma: string): Promise<PartnerCrossLinks> {
  const supabase = await createClient();
  const norm = normalizeName(numeFirma);

  const { data: partner } = await supabase
    .from("partners")
    .select("id, opportunity_id, opportunities(nume_potential)")
    .eq("nume_normalizat", norm)
    .maybeSingle();

  if (!partner) return EMPTY_LINKS;

  const { data: obligatiiRows } = await supabase
    .from("obligatii")
    .select("sold")
    .eq("partner_id", partner.id);

  const otherRoleSummary =
    obligatiiRows && obligatiiRows.length > 0
      ? { sold: obligatiiRows.reduce((s, r) => s + Number(r.sold), 0), count: obligatiiRows.length }
      : null;

  const opportunity = partner.opportunities as unknown as { nume_potential: string } | null;

  return {
    opportunityId: partner.opportunity_id,
    opportunityNume: opportunity?.nume_potential ?? null,
    otherRoleSummary,
  };
}

/** Pentru Fisa Furnizor: cauta daca aceeasi firma are si o oportunitate CRM
 * sau apare si ca client (Creante). */
export async function getFurnizorCrossLinks(numeFurnizor: string): Promise<PartnerCrossLinks> {
  const supabase = await createClient();
  const norm = normalizeName(numeFurnizor);

  const { data: partner } = await supabase
    .from("partners")
    .select("id, opportunity_id, opportunities(nume_potential)")
    .eq("nume_normalizat", norm)
    .maybeSingle();

  if (!partner) return EMPTY_LINKS;

  const { data: creanteRows } = await supabase
    .from("creante")
    .select("sold")
    .eq("partner_id", partner.id);

  const otherRoleSummary =
    creanteRows && creanteRows.length > 0
      ? { sold: creanteRows.reduce((s, r) => s + Number(r.sold), 0), count: creanteRows.length }
      : null;

  const opportunity = partner.opportunities as unknown as { nume_potential: string } | null;

  return {
    opportunityId: partner.opportunity_id,
    opportunityNume: opportunity?.nume_potential ?? null,
    otherRoleSummary,
  };
}

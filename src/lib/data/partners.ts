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
    .select("id, opportunity_id, opportunities!opportunity_id(nume_potential)")
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
    .select("id, opportunity_id, opportunities!opportunity_id(nume_potential)")
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

export interface FurnizorOption {
  id: string;
  nume: string;
  cod_fiscal: string | null;
}

/**
 * Lista de furnizori pentru selectorul din formularul de adaugare manuala pe
 * Obligatii - din `partners`, la fel ca getClientOptions (Venituri) dar
 * filtrat pe este_furnizor in loc de facturabil.
 */
export async function getFurnizorOptions(): Promise<FurnizorOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partners")
    .select("id, nume, cod_fiscal")
    .eq("este_furnizor", true)
    .order("nume", { ascending: true });

  if (error) {
    console.error("getFurnizorOptions error:", error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Mapare partner_id -> nume_grup, pentru toti partenerii care au un grup
 * completat (Setari -> Parteneri). Folosita in Dashboard Creante/Venituri
 * la "Top Clienti" - daca o firma are grup, intra in raport sub numele
 * grupului (ex. mai multe firme separate, aceeasi familie economica).
 */
export async function getPartnerGroupMap(): Promise<Record<string, string>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partners")
    .select("id, nume_grup")
    .not("nume_grup", "is", null);

  if (error) {
    console.error("getPartnerGroupMap error:", error.message);
    return {};
  }

  const map: Record<string, string> = {};
  for (const p of data ?? []) {
    if (p.nume_grup) map[p.id] = p.nume_grup;
  }
  return map;
}

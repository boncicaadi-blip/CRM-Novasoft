import { createClient } from "@/lib/supabase/server";

export interface PartnerOverviewRow {
  id: string;
  nume: string;
  nume_normalizat: string;
  cod_fiscal: string | null;
  facturabil: boolean;
  este_furnizor: boolean;
  potential: boolean;
  website: string | null;
  nume_grup: string | null;
  opportunity_id: string | null;
  opportunity_nume: string | null;
  nr_creante: number;
  nr_obligatii: number;
  nr_contracte: number;
  nr_linii: number;
}

export async function getPartnersOverview(): Promise<PartnerOverviewRow[]> {
  const supabase = await createClient();

  const [
    { data: partners, error: partnersError },
    { data: creante },
    { data: obligatii },
    { data: contracte },
    { data: linii },
  ] = await Promise.all([
    supabase.from("partners").select("id, nume, nume_normalizat, cod_fiscal, facturabil, este_furnizor, potential, website, nume_grup, opportunity_id, opportunities!opportunity_id(nume_potential)"),
    supabase.from("creante").select("partner_id").not("partner_id", "is", null),
    supabase.from("obligatii").select("partner_id").not("partner_id", "is", null),
    supabase.from("contracte").select("partner_id").not("partner_id", "is", null),
    supabase.from("venituri_linii").select("partner_id").not("partner_id", "is", null),
  ]);

  if (partnersError || !partners) {
    console.error("getPartnersOverview error:", partnersError?.message);
    return [];
  }

  function countBy(rows: { partner_id: string | null }[] | null): Map<string, number> {
    const map = new Map<string, number>();
    for (const r of rows ?? []) {
      if (!r.partner_id) continue;
      map.set(r.partner_id, (map.get(r.partner_id) ?? 0) + 1);
    }
    return map;
  }

  const creanteCount = countBy(creante);
  const obligatiiCount = countBy(obligatii);
  const contracteCount = countBy(contracte);
  const liniiCount = countBy(linii);

  return partners
    .map((p) => {
      const opportunity = p.opportunities as unknown as { nume_potential: string } | null;
      return {
        id: p.id,
        nume: p.nume,
        nume_normalizat: p.nume_normalizat,
        cod_fiscal: p.cod_fiscal,
        facturabil: p.facturabil,
        este_furnizor: p.este_furnizor,
        potential: p.potential,
        website: p.website,
        nume_grup: p.nume_grup,
        opportunity_id: p.opportunity_id,
        opportunity_nume: opportunity?.nume_potential ?? null,
        nr_creante: creanteCount.get(p.id) ?? 0,
        nr_obligatii: obligatiiCount.get(p.id) ?? 0,
        nr_contracte: contracteCount.get(p.id) ?? 0,
        nr_linii: liniiCount.get(p.id) ?? 0,
      };
    })
    .sort((a, b) => a.nume.localeCompare(b.nume));
}

import { createClient } from "@/lib/supabase/server";

export interface PartnerOpportunityRow {
  id: string;
  opportunity_code: string | null;
  nume_potential: string;
  stage: string;
  status: string;
  created_at: string;
}

export interface PartnerDetail {
  id: string;
  nume: string;
  cod_fiscal: string | null;
  nume_grup: string | null;
  website: string | null;
  facturabil: boolean;
  este_furnizor: boolean;

  // Date pentru generarea contractelor
  adresa: string | null;
  reg_com: string | null;
  forma_juridica: string | null;
  atribut_fiscal: string;
  reprezentant_nume: string | null;
  reprezentant_functie: string | null;

  domeniul_activitate_id: string | null;
  domeniul_activitate: string | null;
  cod_caen: string | null;
  judet: string | null;
  oras: string | null;
  cifra_afaceri: number | null;
  nr_angajati: number | null;
  cifra_afaceri_an: number | null;
  cifra_afaceri_actualizat_la: string | null;
  nr_vehicule: number | null;

  contact_nume: string | null;
  contact_functie: string | null;
  contact_telefon: string | null;
  contact_email: string | null;
  contact2_nume: string | null;
  contact2_functie: string | null;
  contact2_telefon: string | null;
  contact2_email: string | null;

  solutia_existenta: string | null;
  client_novasoft: boolean;
  client_windsoft: boolean;
  contabilitate_interna: string | null;
  solutie_contabilitate: string | null;
  mai_multe_firme_grup: boolean;
  nr_societati_suplimentare: number | null;
  nume_societati_suplimentare: string | null;
  potential_fonduri_europene: boolean;
  furnizori_combustibil_1: string | null;
  furnizori_combustibil_2: string | null;
  furnizori_combustibil_3: string | null;
  furnizori_gps_1: string | null;
  furnizori_gps_2: string | null;
  detalii_suplimentare_software: string | null;

  oportunitati: PartnerOpportunityRow[];
  nrCreante: number;
  nrObligatii: number;
  nrLiniiVenit: number;
}

export async function getPartnerDetail(id: string): Promise<PartnerDetail | null> {
  const supabase = await createClient();

  const [
    { data: partner, error: partnerError },
    { data: oportunitati },
    { count: nrCreante },
    { count: nrObligatii },
    { count: nrLiniiVenit },
  ] = await Promise.all([
    supabase
      .from("partners")
      .select("*, nomenclatoare(valoare)")
      .eq("id", id)
      .single(),
    supabase
      .from("opportunities")
      .select("id, opportunity_code, nume_potential, stage, status, created_at")
      .eq("partner_id", id)
      .order("created_at", { ascending: true }),
    supabase.from("creante").select("id", { count: "exact", head: true }).eq("partner_id", id),
    supabase.from("obligatii").select("id", { count: "exact", head: true }).eq("partner_id", id),
    supabase.from("venituri_linii").select("id", { count: "exact", head: true }).eq("partner_id", id),
  ]);

  if (partnerError || !partner) {
    console.error("getPartnerDetail error:", partnerError?.message);
    return null;
  }

  const domeniu = (partner.nomenclatoare as unknown as { valoare: string } | null)?.valoare ?? null;

  return {
    ...partner,
    domeniul_activitate: domeniu,
    oportunitati: oportunitati ?? [],
    nrCreante: nrCreante ?? 0,
    nrObligatii: nrObligatii ?? 0,
    nrLiniiVenit: nrLiniiVenit ?? 0,
  };
}

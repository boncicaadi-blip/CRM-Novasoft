"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { supabase, isAdmin: false };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  return { supabase, isAdmin: profile?.role === "admin" };
}

const EDITABLE_FIELDS = [
  "website",
  "domeniul_activitate_id",
  "cod_caen",
  "judet",
  "oras",
  "adresa",
  "reg_com",
  "forma_juridica",
  "atribut_fiscal",
  "reprezentant_nume",
  "reprezentant_functie",
  "cifra_afaceri",
  "nr_angajati",
  "cifra_afaceri_an",
  "cifra_afaceri_actualizat_la",
  "nr_vehicule",
  "contact_nume",
  "contact_functie",
  "contact_telefon",
  "contact_email",
  "contact2_nume",
  "contact2_functie",
  "contact2_telefon",
  "contact2_email",
  "solutia_existenta",
  "client_novasoft",
  "client_windsoft",
  "contabilitate_interna",
  "solutie_contabilitate",
  "mai_multe_firme_grup",
  "nr_societati_suplimentare",
  "nume_societati_suplimentare",
  "potential_fonduri_europene",
  "furnizori_combustibil_1",
  "furnizori_combustibil_2",
  "furnizori_combustibil_3",
  "furnizori_gps_1",
  "furnizori_gps_2",
  "detalii_suplimentare_software",
] as const;

type EditableField = (typeof EDITABLE_FIELDS)[number];

export async function updatePartnerFisaAction(
  partnerId: string,
  fields: Partial<Record<EditableField, string | number | boolean | null>>
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot edita fisa partenerului." };

  const payload: Record<string, string | number | boolean | null> = {};
  for (const key of EDITABLE_FIELDS) {
    if (key in fields) payload[key] = fields[key] ?? null;
  }

  const { error } = await supabase.from("partners").update(payload).eq("id", partnerId);
  if (error) return { success: false, message: error.message };

  revalidatePath(`/parteneri/${partnerId}`);
  return { success: true };
}

/**
 * Completeaza campurile inca goale ale partenerului din cea mai veche
 * oportunitate legata (prima creata) - sursa de incredere pentru "cum a
 * inceput" relatia cu firma. Nu suprascrie niciodata un camp deja completat
 * manual pe partener - doar umple golurile.
 */
export async function backfillPartnerFromOldestOpportunityAction(
  partnerId: string
): Promise<{ success: boolean; message?: string; nrCompletate?: number }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot completa fisa partenerului." };

  const { data: partner, error: partnerError } = await supabase
    .from("partners")
    .select("*")
    .eq("id", partnerId)
    .single();
  if (partnerError || !partner) return { success: false, message: "Partenerul nu a fost gasit." };

  const { data: oldestOpp, error: oppError } = await supabase
    .from("opportunities")
    .select("*")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (oppError) return { success: false, message: oppError.message };
  if (!oldestOpp) return { success: false, message: "Niciun oportunitate legata de acest partener inca." };

  const payload: Record<string, string | number | boolean | null> = {};
  let nrCompletate = 0;
  for (const key of EDITABLE_FIELDS) {
    const partnerVal = (partner as Record<string, unknown>)[key];
    const oppVal = (oldestOpp as Record<string, unknown>)[key];
    const partnerGol = partnerVal === null || partnerVal === undefined || partnerVal === "" || partnerVal === false;
    if (partnerGol && oppVal !== null && oppVal !== undefined && oppVal !== "") {
      payload[key] = oppVal as string | number | boolean | null;
      nrCompletate += 1;
    }
  }

  if (nrCompletate === 0) return { success: true, nrCompletate: 0 };

  const { error: updateError } = await supabase.from("partners").update(payload).eq("id", partnerId);
  if (updateError) return { success: false, message: updateError.message };

  revalidatePath(`/parteneri/${partnerId}`);
  return { success: true, nrCompletate };
}

/**
 * Preia automat cifra de afaceri (convertita in EUR, dupa cursul BNR din
 * 31 decembrie al anului de bilant) si numarul de angajati, direct de la
 * ANAF (bilanturile depuse la Ministerul Finantelor - date publice, gratuite,
 * fara autentificare). Incearca cei mai recenti 4 ani, ia primul cu date
 * disponibile.
 */
async function preiaSiSalveazaDateFinanciare(
  supabase: Awaited<ReturnType<typeof createClient>>,
  partnerId: string,
  codFiscal: string
): Promise<{ success: boolean; message?: string }> {
  const { fetchUltimulBilantAnaf } = await import("@/lib/anaf-bilant");
  const { fetchAnafCompanyInfo } = await import("@/lib/anaf");

  // Doua apeluri separate la ANAF - bilanturile (cifra afaceri, angajati)
  // si serviciul de identificare (judet, oras, cod CAEN) nu vin din acelasi
  // loc. Le combinam aici ca sa completezi tot dintr-un singur click.
  const [bilant, identificare] = await Promise.all([
    fetchUltimulBilantAnaf(codFiscal),
    fetchAnafCompanyInfo(codFiscal),
  ]);

  if (!bilant && !identificare.data) {
    return {
      success: false,
      message: "Nu am gasit nici bilant, nici date de identificare la ANAF pentru acest CIF.",
    };
  }

  const payload: Record<string, string | number | null> = {};
  const mesajeSuccess: string[] = [];

  if (bilant) {
    payload.nr_angajati = bilant.nrAngajati;
    payload.cifra_afaceri_an = bilant.an;
    payload.cifra_afaceri_actualizat_la = new Date().toISOString().slice(0, 10);
    if (bilant.cifraDeAfaceri !== null) {
      const { getCursValutarAction } = await import("@/lib/actions/bnr");
      const curs = await getCursValutarAction(`${bilant.an}-12-31`, "EUR");
      if (curs.success && curs.curs) {
        payload.cifra_afaceri = Math.round((bilant.cifraDeAfaceri / curs.curs) * 100) / 100;
      }
    }
    mesajeSuccess.push(`bilant pe ${bilant.an}`);
  }

  if (identificare.data) {
    if (identificare.data.judet) payload.judet = identificare.data.judet;
    if (identificare.data.oras) payload.oras = identificare.data.oras;
    if (identificare.data.domeniulActivitate) payload.cod_caen = identificare.data.domeniulActivitate;
    mesajeSuccess.push("judet/oras/CAEN");
  }

  const { error: updateError } = await supabase.from("partners").update(payload).eq("id", partnerId);
  if (updateError) return { success: false, message: updateError.message };

  return {
    success: true,
    message: `Preluat: ${mesajeSuccess.join(", ")}${bilant ? ` - ${bilant.nrAngajati ?? "—"} angajati` : ""}.`,
  };
}

export async function preiaDateFinanciareAnafAction(
  partnerId: string
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot prelua date financiare." };

  const { data: partner, error: partnerError } = await supabase
    .from("partners")
    .select("cod_fiscal")
    .eq("id", partnerId)
    .single();
  if (partnerError || !partner) return { success: false, message: "Partenerul nu a fost gasit." };
  if (!partner.cod_fiscal) return { success: false, message: "Partenerul nu are CIF completat." };

  const result = await preiaSiSalveazaDateFinanciare(supabase, partnerId, partner.cod_fiscal);
  revalidatePath(`/parteneri/${partnerId}`);
  return result;
}

/**
 * Completeaza in bloc datele financiare (cifra de afaceri + nr. angajati),
 * din bilanturile ANAF, pentru toti partenerii bifati Client si/sau
 * Potential (indiferent daca sunt si Furnizor) - exclude doar furnizorii
 * "puri" (fara nicio bifa de Client/Potential) si cei fara nicio bifa deloc.
 * Sechential (nu in paralel) - ANAF e un serviciu public, nu vrem sa-l
 * suprasolicitam. Poate dura ceva daca sunt multi parteneri eligibili.
 */
export async function preiaDateFinanciareBulkAction(): Promise<{
  success: boolean;
  message?: string;
  nrActualizati?: number;
  nrEsuati?: number;
  nrFaraCif?: number;
}> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot prelua date financiare." };

  const { data: partners, error } = await supabase
    .from("partners")
    .select("id, cod_fiscal")
    .or("facturabil.eq.true,potential.eq.true");

  if (error) return { success: false, message: error.message };
  if (!partners || partners.length === 0) {
    return { success: true, nrActualizati: 0, nrEsuati: 0, nrFaraCif: 0 };
  }

  let nrActualizati = 0;
  let nrEsuati = 0;
  let nrFaraCif = 0;

  for (const p of partners) {
    if (!p.cod_fiscal) {
      nrFaraCif += 1;
      continue;
    }
    const result = await preiaSiSalveazaDateFinanciare(supabase, p.id, p.cod_fiscal);
    if (result.success) nrActualizati += 1;
    else nrEsuati += 1;
  }

  revalidatePath("/setari/parteneri");
  return { success: true, nrActualizati, nrEsuati, nrFaraCif };
}

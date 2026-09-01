"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeName } from "@/lib/normalizeName";
import { cleanAndValidateCif } from "@/lib/cif-utils";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { supabase, isAdmin: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  return { supabase, isAdmin: profile?.role === "admin" };
}

/** Propaga numele canonic al unui partener peste toate randurile legate de el (Creante, Obligatii, Contracte, Linii venit). */
async function propagatePartnerName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  partnerId: string,
  nume: string
): Promise<{ creante: number; obligatii: number; contracte: number; linii: number }> {
  const [creanteRes, obligatiiRes, contracteRes, liniiRes] = await Promise.all([
    supabase.from("creante").update({ nume_firma: nume }).eq("partner_id", partnerId).select("id"),
    supabase.from("obligatii").update({ nume_furnizor: nume }).eq("partner_id", partnerId).select("id"),
    supabase.from("contracte").update({ nume_client: nume }).eq("partner_id", partnerId).select("id"),
    supabase.from("venituri_linii").update({ nume_client: nume }).eq("partner_id", partnerId).select("id"),
  ]);

  return {
    creante: creanteRes.data?.length ?? 0,
    obligatii: obligatiiRes.data?.length ?? 0,
    contracte: contracteRes.data?.length ?? 0,
    linii: liniiRes.data?.length ?? 0,
  };
}

/**
 * Editeaza numele si/sau CIF-ul canonic al unui partener, apoi propaga
 * automat noul nume peste toate Creantele/Obligatiile/Contractele/Liniile
 * de venit legate de el - un singur loc de adevar, nicaieri nu ramane
 * numele vechi dupa ce il corectezi aici.
 */
export async function updatePartnerAction(
  partnerId: string,
  fields: { nume?: string; cod_fiscal?: string | null; facturabil?: boolean; este_furnizor?: boolean; potential?: boolean; nume_grup?: string | null }
): Promise<{ success: boolean; message?: string; propagat?: { creante: number; obligatii: number; contracte: number; linii: number } }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot edita parteneri." };

  const updatePayload: Record<string, string | null | boolean> = {};
  if (fields.facturabil !== undefined) updatePayload.facturabil = fields.facturabil;
  if (fields.este_furnizor !== undefined) updatePayload.este_furnizor = fields.este_furnizor;
  if (fields.potential !== undefined) updatePayload.potential = fields.potential;
  if (fields.nume_grup !== undefined) updatePayload.nume_grup = fields.nume_grup?.trim().toUpperCase() || null;
  if (fields.nume !== undefined) {
    const nume = fields.nume.trim().toUpperCase();
    if (!nume) return { success: false, message: "Numele nu poate fi gol." };
    updatePayload.nume = nume;
    updatePayload.nume_normalizat = normalizeName(nume);
  }
  if (fields.cod_fiscal !== undefined) {
    if (fields.cod_fiscal && fields.cod_fiscal.trim()) {
      const valid = cleanAndValidateCif(fields.cod_fiscal);
      if (!valid) {
        return {
          success: false,
          message: `"${fields.cod_fiscal}" arata ca un Nr. Reg. Com. (are litere/bare oblice), nu ca un CIF - verifica valoarea.`,
        };
      }
      updatePayload.cod_fiscal = valid;
    } else {
      updatePayload.cod_fiscal = null;
    }
  }

  const { data: updated, error } = await supabase
    .from("partners")
    .update(updatePayload)
    .eq("id", partnerId)
    .select("nume, cod_fiscal")
    .single();

  if (error) return { success: false, message: error.message };

  // Verificare explicita - daca ce s-a salvat nu se potriveste cu ce am
  // trimis (RLS a filtrat linistit, sau alt motiv), spunem clar, nu lasam
  // impresia falsa ca s-a salvat cand de fapt nu s-a intamplat nimic.
  if (fields.cod_fiscal !== undefined && updated.cod_fiscal !== updatePayload.cod_fiscal) {
    return {
      success: false,
      message: `Salvarea CIF nu s-a confirmat (trimis "${updatePayload.cod_fiscal}", ramas "${updated.cod_fiscal ?? "gol"}"). Verifica din nou.`,
    };
  }
  if (fields.nume !== undefined && updated.nume !== updatePayload.nume) {
    return {
      success: false,
      message: `Salvarea numelui nu s-a confirmat (trimis "${updatePayload.nume}", ramas "${updated.nume}"). Verifica din nou.`,
    };
  }

  let propagat;
  if (fields.nume !== undefined) {
    propagat = await propagatePartnerName(supabase, partnerId, fields.nume.trim().toUpperCase());
  }

  revalidatePath("/setari/parteneri");
  revalidatePath("/creante");
  revalidatePath("/obligatii");
  revalidatePath("/venituri-cheltuieli");
  return { success: true, propagat };
}

/**
 * Completeaza CIF-ul lipsa pe toti partenerii, din orice sursa de incredere
 * deja disponibila:
 *  1. Oportunitatea CRM legata (opportunity_id -> cod_fiscal)
 *  2. Facturile deja legate prin partner_id, care au CIF din SPV/ANAF
 *     (Creante.cif_client, Obligatii.cif_furnizor)
 * Nu ghiceste niciodata - doar copiaza CIF deja existent in alta parte.
 */
export async function backfillCodFiscalFromOpportunitiesAction(): Promise<{
  success: boolean;
  message?: string;
  nrCompletate?: number;
}> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot rula aceasta actiune." };

  const { data: partnersFaraCif, error } = await supabase
    .from("partners")
    .select("id, opportunity_id, opportunities!opportunity_id(cod_fiscal)")
    .is("cod_fiscal", null);

  if (error) return { success: false, message: error.message };
  if (!partnersFaraCif || partnersFaraCif.length === 0) {
    return { success: true, nrCompletate: 0 };
  }

  const idsFaraCif = partnersFaraCif.map((p) => p.id);

  const [{ data: creanteCuCif }, { data: obligatiiCuCif }] = await Promise.all([
    supabase.from("creante").select("partner_id, cif_client").in("partner_id", idsFaraCif).not("cif_client", "is", null),
    supabase.from("obligatii").select("partner_id, cif_furnizor").in("partner_id", idsFaraCif).not("cif_furnizor", "is", null),
  ]);

  const cifDinFacturi = new Map<string, string>();
  for (const c of creanteCuCif ?? []) {
    if (c.partner_id && c.cif_client && !cifDinFacturi.has(c.partner_id)) cifDinFacturi.set(c.partner_id, c.cif_client);
  }
  for (const o of obligatiiCuCif ?? []) {
    if (o.partner_id && o.cif_furnizor && !cifDinFacturi.has(o.partner_id)) cifDinFacturi.set(o.partner_id, o.cif_furnizor);
  }

  let nrCompletate = 0;
  for (const p of partnersFaraCif) {
    const oppCodFiscal = (p.opportunities as unknown as { cod_fiscal: string | null } | null)?.cod_fiscal;
    const codFiscalBrut = oppCodFiscal || cifDinFacturi.get(p.id);
    const codFiscal = codFiscalBrut ? cleanAndValidateCif(codFiscalBrut) : null;
    if (!codFiscal) continue;

    const { error: updateError } = await supabase.from("partners").update({ cod_fiscal: codFiscal }).eq("id", p.id);
    if (!updateError) nrCompletate += 1;
  }

  revalidatePath("/setari/parteneri");
  return { success: true, nrCompletate };
}

/**
 * Fuzioneaza mai multi parteneri duplicat (acelasi CIF, randuri separate)
 * intr-unul singur - muta toate legaturile (Creante/Obligatii/Contracte/
 * Linii venit) pe partenerul pastrat, aplica numele lui canonic peste tot,
 * apoi sterge randurile duplicat. Ireversibil - se cere confirmare in UI.
 */
export async function mergePartnersAction(
  keepId: string,
  mergeIds: string[]
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot fuziona parteneri." };

  const idsDeSters = mergeIds.filter((id) => id !== keepId);
  if (idsDeSters.length === 0) return { success: false, message: "Nimic de fuzionat." };

  const { data: keeper, error: keeperError } = await supabase
    .from("partners")
    .select("nume")
    .eq("id", keepId)
    .single();
  if (keeperError || !keeper) return { success: false, message: "Partenerul de pastrat nu a fost gasit." };

  const reassign = await Promise.all([
    supabase.from("creante").update({ partner_id: keepId }).in("partner_id", idsDeSters),
    supabase.from("obligatii").update({ partner_id: keepId }).in("partner_id", idsDeSters),
    supabase.from("contracte").update({ partner_id: keepId }).in("partner_id", idsDeSters),
    supabase.from("venituri_linii").update({ partner_id: keepId }).in("partner_id", idsDeSters),
    supabase.from("opportunities").update({ partner_id: keepId }).in("partner_id", idsDeSters),
  ]);
  const reassignError = reassign.find((r) => r.error);
  if (reassignError?.error) return { success: false, message: reassignError.error.message };

  const numeCanonic = keeper.nume.toUpperCase();
  if (numeCanonic !== keeper.nume) {
    await supabase.from("partners").update({ nume: numeCanonic, nume_normalizat: normalizeName(numeCanonic) }).eq("id", keepId);
  }
  await propagatePartnerName(supabase, keepId, numeCanonic);

  const { error: deleteError } = await supabase.from("partners").delete().in("id", idsDeSters);
  if (deleteError) return { success: false, message: deleteError.message };

  revalidatePath("/setari/parteneri");
  revalidatePath("/creante");
  revalidatePath("/obligatii");
  revalidatePath("/venituri-cheltuieli");
  return { success: true };
}

export interface VerificareTermeneRezultat {
  partnerId: string;
  numeCurent: string;
  numeTermene: string | null;
  eroare: string | null;
}

/**
 * Verifica in bloc, pe Termene.ro, denumirea oficiala pentru toti partenerii
 * care au deja CIF completat - returneaza doar cazurile unde numele
 * inregistrat difera de cel oficial (nu aplica nimic automat, tu alegi ce
 * sa corectezi din lista).
 */
export async function verificaDenumiriTermeneAction(): Promise<{
  success: boolean;
  message?: string;
  rezultate?: VerificareTermeneRezultat[];
}> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot verifica denumiri." };

  const { data: partners, error } = await supabase
    .from("partners")
    .select("id, nume, cod_fiscal")
    .not("cod_fiscal", "is", null);

  if (error) return { success: false, message: error.message };
  if (!partners || partners.length === 0) {
    return { success: true, rezultate: [] };
  }

  const { fetchAnafCompanyInfo } = await import("@/lib/anaf");

  const rezultate: VerificareTermeneRezultat[] = [];
  for (const p of partners) {
    if (!p.cod_fiscal) continue;
    const { data, error: lookupError } = await fetchAnafCompanyInfo(p.cod_fiscal);
    if (lookupError || !data?.denumire) {
      rezultate.push({ partnerId: p.id, numeCurent: p.nume, numeTermene: null, eroare: lookupError });
      continue;
    }
    const numeTermene = data.denumire.toUpperCase();
    if (normalizeName(numeTermene) !== normalizeName(p.nume)) {
      rezultate.push({ partnerId: p.id, numeCurent: p.nume, numeTermene, eroare: null });
    }
  }

  return { success: true, rezultate };
}

/**
 * Curata CIF-urile deja salvate care arata ca Nr. Reg. Com. (litere/bare
 * oblice) - ramase din date vechi (dinainte de fixul din parserul de
 * facturi). Le goleste, nu incearca sa ghiceasca CIF-ul real - se poate
 * recompleta dupa aceea din "Completeaza CIF" (surse curate) sau manual.
 */
export async function curataCifInvalideAction(): Promise<{
  success: boolean;
  message?: string;
  nrCuratate?: number;
}> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot rula aceasta actiune." };

  const { data: partners, error } = await supabase
    .from("partners")
    .select("id, cod_fiscal")
    .not("cod_fiscal", "is", null);

  if (error) return { success: false, message: error.message };

  const invalizi = (partners ?? []).filter((p) => p.cod_fiscal && !cleanAndValidateCif(p.cod_fiscal));
  if (invalizi.length === 0) {
    return { success: true, nrCuratate: 0, message: "Niciun CIF invalid gasit." };
  }

  const { error: updateError } = await supabase
    .from("partners")
    .update({ cod_fiscal: null })
    .in("id", invalizi.map((p) => p.id));

  if (updateError) return { success: false, message: updateError.message };

  revalidatePath("/setari/parteneri");
  return { success: true, nrCuratate: invalizi.length };
}

/**
 * Aplica in bloc toate corectiile de denumire gasite de verificarea
 * Termene.ro (verificaDenumiriTermeneAction) - fara sa mai fie nevoie de
 * click individual "Aplica" pe fiecare rand.
 */
export async function aplicaToateNumeleTermeneAction(
  rezultate: { partnerId: string; numeTermene: string | null }[]
): Promise<{ success: boolean; message?: string; nrAplicate?: number }> {
  const valide = rezultate.filter((r) => r.numeTermene);
  if (valide.length === 0) return { success: false, message: "Nimic de aplicat." };

  let nrAplicate = 0;
  const erori: string[] = [];

  for (const r of valide) {
    const result = await updatePartnerAction(r.partnerId, { nume: r.numeTermene! });
    if (result.success) nrAplicate += 1;
    else erori.push(result.message ?? "eroare necunoscuta");
  }

  if (erori.length > 0) {
    return { success: nrAplicate > 0, message: `${nrAplicate} aplicate. ${erori.length} erori.`, nrAplicate };
  }
  return { success: true, nrAplicate };
}

/**
 * Creaza manual un partener nou, direct din Setari -> Parteneri - pentru
 * cazuri in care nu exista inca nicio Creanta/Obligatie/Contract care sa-l
 * fi generat automat (ex. un furnizor nou, cunoscut dinainte sa apara prima
 * factura).
 */
export async function createPartnerAction(fields: {
  nume: string;
  cod_fiscal?: string | null;
  facturabil?: boolean;
  este_furnizor?: boolean;
  potential?: boolean;
}): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot adauga parteneri." };

  const nume = fields.nume.trim().toUpperCase();
  if (!nume) return { success: false, message: "Numele este obligatoriu." };

  let codFiscal: string | null = null;
  if (fields.cod_fiscal && fields.cod_fiscal.trim()) {
    const valid = cleanAndValidateCif(fields.cod_fiscal);
    if (!valid) {
      return {
        success: false,
        message: `"${fields.cod_fiscal}" arata ca un Nr. Reg. Com. (are litere/bare oblice), nu ca un CIF - verifica valoarea.`,
      };
    }
    codFiscal = valid;
  }

  const numeNormalizat = normalizeName(nume);

  const { data: existent } = await supabase
    .from("partners")
    .select("id, nume")
    .eq("nume_normalizat", numeNormalizat)
    .maybeSingle();

  if (existent) {
    return { success: false, message: `Exista deja un partener cu acest nume: "${existent.nume}".` };
  }

  const { error } = await supabase.from("partners").insert({
    nume,
    nume_normalizat: numeNormalizat,
    cod_fiscal: codFiscal,
    facturabil: fields.facturabil ?? false,
    este_furnizor: fields.este_furnizor ?? false,
    potential: fields.potential ?? false,
  });

  if (error) return { success: false, message: error.message };

  revalidatePath("/setari/parteneri");
  return { success: true };
}

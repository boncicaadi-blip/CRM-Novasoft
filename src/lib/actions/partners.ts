"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeName } from "@/lib/normalizeName";

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

/**
 * Sincronizeaza tabelul de parteneri: creeaza cate o intrare pentru fiecare
 * firma distincta din Creante/Obligatii (daca nu exista deja), o leaga de o
 * oportunitate CRM daca gaseste un nume potrivit, apoi actualizeaza
 * partner_id pe toate facturile corespunzatoare.
 *
 * Nu atinge deloc nume_firma/nume_furnizor - e sigur de rulat oricand,
 * de cate ori e nevoie (ex: dupa un import nou cu firme noi).
 */
export async function syncPartnersAction(): Promise<{
  success: boolean;
  message?: string;
  data?: { parteneriNoi: number; creanteLegate: number; obligatiiLegate: number };
}> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot sincroniza partenerii." };

  const [
    { data: creanteRows, error: creanteError },
    { data: obligatiiRows, error: obligatiiError },
    { data: opportunities, error: oppError },
    { data: existingPartners, error: partnersError },
  ] = await Promise.all([
    supabase.from("creante").select("id, nume_firma"),
    supabase.from("obligatii").select("id, nume_furnizor"),
    supabase.from("opportunities").select("id, nume_potential, nume_grup"),
    supabase.from("partners").select("id, nume_normalizat"),
  ]);

  const firstError = creanteError || obligatiiError || oppError || partnersError;
  if (firstError) return { success: false, message: firstError.message };

  const existingByNorm = new Map((existingPartners ?? []).map((p) => [p.nume_normalizat, p.id]));

  const opportunityByNorm = new Map<string, string>();
  for (const o of opportunities ?? []) {
    opportunityByNorm.set(normalizeName(o.nume_potential), o.id);
    if (o.nume_grup) opportunityByNorm.set(normalizeName(o.nume_grup), o.id);
  }

  // Colectam toate numele distincte (Creante + Obligatii), pastrand primul
  // nume "de afisare" intalnit pentru fiecare varianta normalizata.
  const allNames = new Map<string, string>();
  for (const c of creanteRows ?? []) {
    const norm = normalizeName(c.nume_firma);
    if (!allNames.has(norm)) allNames.set(norm, c.nume_firma);
  }
  for (const o of obligatiiRows ?? []) {
    const norm = normalizeName(o.nume_furnizor);
    if (!allNames.has(norm)) allNames.set(norm, o.nume_furnizor);
  }

  const toInsert = Array.from(allNames.entries())
    .filter(([norm]) => !existingByNorm.has(norm))
    .map(([norm, display]) => ({
      nume: display,
      nume_normalizat: norm,
      opportunity_id: opportunityByNorm.get(norm) ?? null,
    }));

  if (toInsert.length > 0) {
    const { data: inserted, error } = await supabase
      .from("partners")
      .insert(toInsert)
      .select("id, nume_normalizat");
    if (error) return { success: false, message: `Eroare la creare parteneri: ${error.message}` };
    for (const p of inserted ?? []) existingByNorm.set(p.nume_normalizat, p.id);
  }

  // Grupam facturile pe partenerul-tinta, ca sa actualizam printr-un singur
  // apel per partener (nu per factura - mult mai putine round-trip-uri).
  const creanteIdsByPartner = new Map<string, string[]>();
  for (const c of creanteRows ?? []) {
    const partnerId = existingByNorm.get(normalizeName(c.nume_firma));
    if (!partnerId) continue;
    (creanteIdsByPartner.get(partnerId) ?? creanteIdsByPartner.set(partnerId, []).get(partnerId)!).push(c.id);
  }

  const obligatiiIdsByPartner = new Map<string, string[]>();
  for (const o of obligatiiRows ?? []) {
    const partnerId = existingByNorm.get(normalizeName(o.nume_furnizor));
    if (!partnerId) continue;
    (obligatiiIdsByPartner.get(partnerId) ?? obligatiiIdsByPartner.set(partnerId, []).get(partnerId)!).push(
      o.id
    );
  }

  let creanteLegate = 0;
  for (const [partnerId, ids] of creanteIdsByPartner) {
    const { error } = await supabase.from("creante").update({ partner_id: partnerId }).in("id", ids);
    if (!error) creanteLegate += ids.length;
  }

  let obligatiiLegate = 0;
  for (const [partnerId, ids] of obligatiiIdsByPartner) {
    const { error } = await supabase.from("obligatii").update({ partner_id: partnerId }).in("id", ids);
    if (!error) obligatiiLegate += ids.length;
  }

  revalidatePath("/creante");
  revalidatePath("/obligatii");
  return {
    success: true,
    data: { parteneriNoi: toInsert.length, creanteLegate, obligatiiLegate },
  };
}

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
 * firma distincta din Creante/Obligatii/Oportunitati (daca nu exista deja),
 * apoi leaga de partenerul corespunzator DOAR randurile care inca nu au
 * partner_id setat.
 *
 * Important: randurile care au deja partner_id (fie dintr-o sincronizare
 * anterioara, fie dintr-o corectare/fuziune manuala din Setari -> Parteneri)
 * NU sunt atinse deloc, indiferent ce scrie in campul de nume brut - altfel
 * o corectie facuta manual (nume rescris, parteneri fuzionati) ar fi
 * anulata de urmatoarea sincronizare, recreand duplicatul tocmai reparat.
 */
export async function syncPartnersAction(): Promise<{
  success: boolean;
  message?: string;
  data?: { parteneriNoi: number; creanteLegate: number; obligatiiLegate: number; oportunitatiLegate: number };
}> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot sincroniza partenerii." };

  const [
    { data: creanteRows, error: creanteError },
    { data: obligatiiRows, error: obligatiiError },
    { data: opportunities, error: oppError },
    { data: existingPartners, error: partnersError },
  ] = await Promise.all([
    supabase.from("creante").select("id, nume_firma, partner_id"),
    supabase.from("obligatii").select("id, nume_furnizor, partner_id"),
    supabase.from("opportunities").select("id, nume_potential, nume_grup, partner_id"),
    supabase.from("partners").select("id, nume_normalizat"),
  ]);

  const firstError = creanteError || obligatiiError || oppError || partnersError;
  if (firstError) return { success: false, message: firstError.message };

  const existingByNorm = new Map((existingPartners ?? []).map((p) => [p.nume_normalizat, p.id]));

  // Doar randurile INCA NELEGATE (partner_id null) intra in calculul de
  // "nume noi de creat" si in lista de legat - cele deja legate raman
  // exact cum au fost lasate (manual sau de o sincronizare anterioara).
  const creanteNelegate = (creanteRows ?? []).filter((c) => !c.partner_id);
  const obligatiiNelegate = (obligatiiRows ?? []).filter((o) => !o.partner_id);
  const oportunitatiNelegate = (opportunities ?? []).filter((o) => !o.partner_id);

  const opportunityByNorm = new Map<string, string>();
  for (const o of oportunitatiNelegate) {
    opportunityByNorm.set(normalizeName(o.nume_potential), o.id);
    if (o.nume_grup) opportunityByNorm.set(normalizeName(o.nume_grup), o.id);
  }

  // Colectam toate numele distincte (doar din randurile nelegate),
  // pastrand primul nume "de afisare" intalnit pentru fiecare varianta
  // normalizata.
  const allNames = new Map<string, string>();
  for (const c of creanteNelegate) {
    const norm = normalizeName(c.nume_firma);
    if (!allNames.has(norm)) allNames.set(norm, c.nume_firma);
  }
  for (const o of obligatiiNelegate) {
    const norm = normalizeName(o.nume_furnizor);
    if (!allNames.has(norm)) allNames.set(norm, o.nume_furnizor);
  }
  for (const opp of oportunitatiNelegate) {
    const norm = normalizeName(opp.nume_potential);
    if (!allNames.has(norm)) allNames.set(norm, opp.nume_potential);
  }

  const toInsert = Array.from(allNames.entries())
    .filter(([norm]) => !existingByNorm.has(norm))
    .map(([norm, display]) => ({
      nume: display.toUpperCase(),
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

  // Grupam randurile nelegate pe partenerul-tinta, ca sa actualizam printr-un
  // singur apel per partener (nu per rand - mult mai putine round-trip-uri).
  const creanteIdsByPartner = new Map<string, string[]>();
  for (const c of creanteNelegate) {
    const partnerId = existingByNorm.get(normalizeName(c.nume_firma));
    if (!partnerId) continue;
    (creanteIdsByPartner.get(partnerId) ?? creanteIdsByPartner.set(partnerId, []).get(partnerId)!).push(c.id);
  }

  const obligatiiIdsByPartner = new Map<string, string[]>();
  for (const o of obligatiiNelegate) {
    const partnerId = existingByNorm.get(normalizeName(o.nume_furnizor));
    if (!partnerId) continue;
    (obligatiiIdsByPartner.get(partnerId) ?? obligatiiIdsByPartner.set(partnerId, []).get(partnerId)!).push(
      o.id
    );
  }

  const oportunitatiIdsByPartner = new Map<string, string[]>();
  for (const opp of oportunitatiNelegate) {
    const partnerId = existingByNorm.get(normalizeName(opp.nume_potential));
    if (!partnerId) continue;
    (
      oportunitatiIdsByPartner.get(partnerId) ?? oportunitatiIdsByPartner.set(partnerId, []).get(partnerId)!
    ).push(opp.id);
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

  let oportunitatiLegate = 0;
  for (const [partnerId, ids] of oportunitatiIdsByPartner) {
    const { error } = await supabase.from("opportunities").update({ partner_id: partnerId }).in("id", ids);
    if (!error) oportunitatiLegate += ids.length;
  }

  revalidatePath("/creante");
  revalidatePath("/obligatii");
  revalidatePath("/pipeline");
  revalidatePath("/setari/parteneri");
  return {
    success: true,
    data: { parteneriNoi: toInsert.length, creanteLegate, obligatiiLegate, oportunitatiLegate },
  };
}

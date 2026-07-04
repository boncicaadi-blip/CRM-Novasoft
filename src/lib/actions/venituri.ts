"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeName } from "@/lib/normalizeName";
import { runVenituriLiniiSync } from "@/lib/venituri-sync";
import type { ContractStatus } from "@/types/venituri";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { supabase, userId: null, isAdmin: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  return { supabase, userId: userData.user.id, isAdmin: profile?.role === "admin" };
}

/**
 * Gaseste (sau creeaza) partenerul asociat unei oportunitati - reutilizeaza
 * aceeasi identitate de firma ca in Creante/Obligatii, nu mai creeaza un
 * al doilea "client" separat, in text liber.
 */
async function resolvePartnerId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  opportunityId: string,
  numeClient: string
): Promise<string | null> {
  const { data: existing } = await supabase
    .from("partners")
    .select("id")
    .eq("opportunity_id", opportunityId)
    .maybeSingle();
  if (existing) return existing.id;

  const norm = normalizeName(numeClient);
  const { data: byName } = await supabase
    .from("partners")
    .select("id")
    .eq("nume_normalizat", norm)
    .maybeSingle();
  if (byName) {
    await supabase.from("partners").update({ opportunity_id: opportunityId }).eq("id", byName.id);
    return byName.id;
  }

  const { data: created } = await supabase
    .from("partners")
    .insert({ nume: numeClient, nume_normalizat: norm, opportunity_id: opportunityId })
    .select("id")
    .single();
  return created?.id ?? null;
}

/** Server Action pentru butonul "Genereaza linii lipsa". */
export async function syncVenituriLiniiAction(): Promise<{
  success: boolean;
  message?: string;
  data?: { generate: number };
}> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot sincroniza veniturile." };

  const result = await runVenituriLiniiSync(supabase);

  revalidatePath("/venituri-cheltuieli");
  return { success: true, data: result };
}

export async function createContractAction(fields: {
  opportunity_id: string;
  nume_client: string;
  tip_venit: "Recurent" | "Nerecurent";
  produs?: string | null;
  serviciu?: string | null;
  valoare_lunara: number;
  data_inceput: string;
  data_sfarsit?: string | null;
  status_contract?: ContractStatus;
  stadiu_contract?: string | null;
  modalitate_facturare?: string | null;
  observatii?: string | null;
}): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot crea contracte." };

  if (!fields.opportunity_id) return { success: false, message: "Trebuie sa alegi un client din lista." };
  if (fields.valoare_lunara <= 0) return { success: false, message: "Valoarea trebuie sa fie pozitiva." };

  const partnerId = await resolvePartnerId(supabase, fields.opportunity_id, fields.nume_client);

  const { error } = await supabase.from("contracte").insert({
    ...fields,
    partner_id: partnerId,
    status_contract: fields.status_contract ?? "Activ",
  });
  if (error) return { success: false, message: error.message };

  await runVenituriLiniiSync(supabase);

  revalidatePath("/venituri-cheltuieli");
  return { success: true };
}

export async function updateContractAction(
  id: string,
  fields: {
    produs?: string | null;
    serviciu?: string | null;
    valoare_lunara?: number;
    data_sfarsit?: string | null;
    status_contract?: ContractStatus;
    stadiu_contract?: string | null;
    modalitate_facturare?: string | null;
    observatii?: string | null;
  }
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot edita contracte." };

  const { error } = await supabase.from("contracte").update(fields).eq("id", id);
  if (error) return { success: false, message: error.message };

  if (fields.status_contract === "Activ") {
    await runVenituriLiniiSync(supabase);
  }

  revalidatePath("/venituri-cheltuieli");
  return { success: true };
}

export async function deleteContractAction(id: string): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot sterge contracte." };

  const { error } = await supabase.from("contracte").delete().eq("id", id);
  if (error) return { success: false, message: error.message };

  revalidatePath("/venituri-cheltuieli");
  return { success: true };
}

/**
 * Editeaza o linie de venit - orice camp, nu doar realizatul. Util pentru
 * corectarea unei greseli, fara sa fie nevoie sa stergi si sa recreezi.
 */
export async function updateVenitLinieAction(
  id: string,
  fields: {
    produs?: string | null;
    serviciu?: string | null;
    venit_estimat?: number;
    venit_realizat?: number | null;
    facturat?: boolean;
    observatii?: string | null;
  }
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot edita venituri." };

  const { error } = await supabase.from("venituri_linii").update(fields).eq("id", id);
  if (error) return { success: false, message: error.message };

  revalidatePath("/venituri-cheltuieli");
  return { success: true };
}

export async function deleteVenitLinieAction(id: string): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot sterge venituri." };

  const { error } = await supabase.from("venituri_linii").delete().eq("id", id);
  if (error) return { success: false, message: error.message };

  revalidatePath("/venituri-cheltuieli");
  return { success: true };
}

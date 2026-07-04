"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizeName } from "@/lib/normalizeName";
import { runVenituriLiniiSync, regenerateContractLines } from "@/lib/venituri-sync";
import type { ContractStatus, TipVenit } from "@/types/venituri";

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

function firstOfMonth(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
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
  tip_venit: TipVenit;
  produs?: string | null;
  serviciu?: string | null;
  valoare_lunara: number;
  nr_rate?: number;
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

  const { data: created, error } = await supabase
    .from("contracte")
    .insert({ ...fields, partner_id: partnerId, status_contract: fields.status_contract ?? "Activ" })
    .select("id")
    .single();
  if (error) return { success: false, message: error.message };

  await regenerateContractLines(supabase, created.id);

  revalidatePath("/venituri-cheltuieli");
  return { success: true };
}

/**
 * Editeaza un contract - orice camp, inclusiv tip venit si data de inceput.
 * Dupa orice editare, liniile de venit ale contractului se regenereaza
 * automat dupa noile setari (vezi regenerateContractLines) - realizatul deja
 * inregistrat se pastreaza, pe cat se suprapune cu noile perioade.
 */
export async function updateContractAction(
  id: string,
  fields: {
    tip_venit?: TipVenit;
    produs?: string | null;
    serviciu?: string | null;
    valoare_lunara?: number;
    nr_rate?: number;
    data_inceput?: string;
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

  await regenerateContractLines(supabase, id);

  revalidatePath("/venituri-cheltuieli");
  return { success: true };
}

/** Sterge un contract - liniile lui de venit se sterg automat (cascada). */
export async function deleteContractAction(id: string): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot sterge contracte." };

  const { error } = await supabase.from("contracte").delete().eq("id", id);
  if (error) return { success: false, message: error.message };

  revalidatePath("/venituri-cheltuieli");
  return { success: true };
}

/**
 * Adauga o linie de venit manual, independenta de un contract - pentru
 * venituri nerecurente cu Rate/Etape (fiecare rata are propria data si
 * valoare) sau orice alt caz care nu se preteaza la generare automata.
 */
export async function addVenitLinieManualAction(fields: {
  opportunity_id: string;
  nume_client: string;
  tip_venit: TipVenit;
  produs?: string | null;
  serviciu?: string | null;
  luna: string;
  venit_estimat: number;
  observatii?: string | null;
}): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot adauga venituri." };

  if (!fields.opportunity_id) return { success: false, message: "Trebuie sa alegi un client din lista." };
  if (fields.venit_estimat <= 0) return { success: false, message: "Valoarea trebuie sa fie pozitiva." };

  const partnerId = await resolvePartnerId(supabase, fields.opportunity_id, fields.nume_client);

  const { error } = await supabase.from("venituri_linii").insert({
    nume_client: fields.nume_client,
    tip_venit: fields.tip_venit,
    produs: fields.produs ?? null,
    serviciu: fields.serviciu ?? null,
    observatii: fields.observatii ?? null,
    venit_estimat: fields.venit_estimat,
    luna: firstOfMonth(fields.luna),
    partner_id: partnerId,
    contract_id: null,
    facturat: false,
    venit_realizat: null,
  });
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
    luna?: string;
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

/** Sterge mai multe linii de venit deodata (selectie bulk din lista). */
export async function deleteVenituriLiniiAction(
  ids: string[]
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot sterge venituri." };
  if (ids.length === 0) return { success: true };

  const { error } = await supabase.from("venituri_linii").delete().in("id", ids);
  if (error) return { success: false, message: error.message };

  revalidatePath("/venituri-cheltuieli");
  return { success: true };
}

/**
 * Marcheaza bulk mai multe linii ca "Facturat" - ia automat valoarea
 * estimata drept valoare realizata (regula: in general estimatul se
 * respecta; exceptiile se corecteaza punctual, ulterior, din editarea
 * individuala a liniei).
 */
export async function bulkMarkFacturatAction(
  ids: string[]
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot edita venituri." };
  if (ids.length === 0) return { success: true };

  const { data: linii, error: fetchError } = await supabase
    .from("venituri_linii")
    .select("id, venit_estimat")
    .in("id", ids);
  if (fetchError) return { success: false, message: fetchError.message };

  for (const linie of linii ?? []) {
    await supabase
      .from("venituri_linii")
      .update({ facturat: true, venit_realizat: linie.venit_estimat })
      .eq("id", linie.id);
  }

  revalidatePath("/venituri-cheltuieli");
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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
  partner_id: string;
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

  if (!fields.partner_id) return { success: false, message: "Trebuie sa alegi un client din lista." };
  if (fields.valoare_lunara <= 0) return { success: false, message: "Valoarea trebuie sa fie pozitiva." };

  const { data: created, error } = await supabase
    .from("contracte")
    .insert({ ...fields, status_contract: fields.status_contract ?? "Activ" })
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
  partner_id: string;
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

  if (!fields.partner_id) return { success: false, message: "Trebuie sa alegi un client din lista." };
  if (fields.venit_estimat === 0) return { success: false, message: "Valoarea nu poate fi 0." };

  const { error } = await supabase.from("venituri_linii").insert({
    nume_client: fields.nume_client,
    tip_venit: fields.tip_venit,
    produs: fields.produs ?? null,
    serviciu: fields.serviciu ?? null,
    observatii: fields.observatii ?? null,
    venit_estimat: fields.venit_estimat,
    luna: firstOfMonth(fields.luna),
    partner_id: fields.partner_id,
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

/**
 * Inversul lui bulkMarkFacturatAction - scoate bifa de facturat si reseteaza
 * venit_realizat la 0 (nu mai are sens sa ramana o valoare realizata pe o
 * linie marcata explicit ca nefacturata).
 */
export async function bulkUnmarkFacturatAction(
  ids: string[]
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot edita venituri." };
  if (ids.length === 0) return { success: true };

  const { error } = await supabase
    .from("venituri_linii")
    .update({ facturat: false, venit_realizat: 0 })
    .in("id", ids);

  if (error) return { success: false, message: error.message };

  revalidatePath("/venituri-cheltuieli");
  return { success: true };
}

/**
 * Muta o estimare de venit intr-o alta luna, pastrand istoricul: creeaza o
 * linie noua, identica, in luna aleasa (cu valoarea data - implicit aceeasi,
 * dar editabila daca ai o estimare mai buna pentru luna noua), iar linia
 * originala ramane la locul ei, marcata "mutata" (mutat_in_linie_id) - nu
 * mai intra in totalurile de estimare de-acum incolo, ca sa nu se numere de
 * doua ori.
 */
export async function mutaEstimareVenitAction(
  linieId: string,
  lunaNoua: string,
  valoareNoua?: number
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot muta estimari." };

  const { data: linie, error: linieError } = await supabase
    .from("venituri_linii")
    .select("*")
    .eq("id", linieId)
    .single();
  if (linieError || !linie) return { success: false, message: "Linia nu a fost gasita." };
  if (linie.mutat_in_linie_id) return { success: false, message: "Aceasta linie a fost deja mutata." };
  if (linie.facturat) return { success: false, message: "O linie deja facturata nu poate fi mutata." };

  const { data: linieNoua, error: insertError } = await supabase
    .from("venituri_linii")
    .insert({
      nume_client: linie.nume_client,
      tip_venit: linie.tip_venit,
      produs: linie.produs,
      serviciu: linie.serviciu,
      observatii: linie.observatii,
      venit_estimat: valoareNoua ?? linie.venit_estimat,
      luna: firstOfMonth(lunaNoua),
      partner_id: linie.partner_id,
      // Nu mostenim contract_id: daca luna-tinta are deja o linie normala,
      // generata din acelasi contract recurent (situatie foarte probabila -
      // de-asta se si muta o estimare, ca sa nu se piarda pe langa cealalta
      // deja existenta acolo), constrangerea unica (contract_id, luna) ar
      // respinge inserarea. Linia mutata devine un rand de sine statator,
      // separat de ciclul normal de generare a contractului.
      contract_id: null,
      facturat: false,
      venit_realizat: null,
    })
    .select("id")
    .single();

  if (insertError || !linieNoua) {
    return { success: false, message: insertError?.message ?? "Eroare la crearea liniei noi." };
  }

  const { error: updateError } = await supabase
    .from("venituri_linii")
    .update({ mutat_in_linie_id: linieNoua.id })
    .eq("id", linieId);
  if (updateError) return { success: false, message: updateError.message };

  revalidatePath("/venituri-cheltuieli");
  return { success: true };
}

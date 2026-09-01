"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUrmatorulNumarContract } from "@/lib/data/registru-contracte";
import type { TipPartenerRegistru } from "@/types/registru-contracte";

async function requireAdminOrEditor() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { ok: false as const, message: "Trebuie sa fii autentificat." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { ok: false as const, message: "Doar administratorii si editorii pot gestiona registrul de contracte." };
  }
  return { ok: true as const, supabase, userId: userData.user.id };
}

export interface RegistruContractPayload {
  tip_partener: TipPartenerRegistru;
  tip_document: string | null;
  data_contract: string | null;
  partner_id: string | null;
  partener_nume_liber: string | null;
  produs_serviciu_id: string | null;
  serviciu_id: string | null;
  detalii_serviciu: string | null;
  contact_nume: string | null;
  contact_email: string | null;
  contact_telefon: string | null;
  contact2_nume: string | null;
  contact2_email: string | null;
  contact2_telefon: string | null;
}

/** Creeaza o intrare noua in registru - numarul de contract se atribuie
 * automat (urmatorul disponibil pentru tipul de partener respectiv), nu se
 * introduce manual. */
export async function creazaInregistrareRegistruAction(
  payload: RegistruContractPayload
): Promise<{ success: boolean; message: string; nrContract?: number }> {
  const check = await requireAdminOrEditor();
  if (!check.ok) return { success: false, message: check.message };

  if (!payload.partner_id && !payload.partener_nume_liber?.trim()) {
    return { success: false, message: "Alege un partener sau introdu un nume." };
  }

  const nrContract = await getUrmatorulNumarContract(payload.tip_partener);

  const { error } = await check.supabase.from("registru_contracte").insert({
    nr_contract: nrContract,
    tip_partener: payload.tip_partener,
    tip_document: payload.tip_document,
    data_contract: payload.data_contract,
    partner_id: payload.partner_id,
    partener_nume_liber: payload.partener_nume_liber,
    produs_serviciu_id: payload.produs_serviciu_id,
    serviciu_id: payload.serviciu_id,
    detalii_serviciu: payload.detalii_serviciu,
    contact_nume: payload.contact_nume,
    contact_email: payload.contact_email,
    contact_telefon: payload.contact_telefon,
    contact2_nume: payload.contact2_nume,
    contact2_email: payload.contact2_email,
    contact2_telefon: payload.contact2_telefon,
    status_draft: true, // orice intrare noua incepe cel putin ca "draft"
    created_by: check.userId,
  });

  if (error) return { success: false, message: error.message };

  revalidatePath("/contracte/registru");
  return { success: true, message: `Inregistrat cu numarul ${nrContract}.`, nrContract };
}

/** Comuta o etapa de status (draft/trimis/in sistem/etc.) - actualizeaza si
 * data ultimului status automat. */
export async function toggleEtapaStatusAction(
  id: string,
  etapa: string,
  valoare: boolean
): Promise<{ success: boolean; message?: string }> {
  const check = await requireAdminOrEditor();
  if (!check.ok) return { success: false, message: check.message };

  const coloaneValide = [
    "status_draft",
    "status_trimis",
    "status_in_sistem",
    "status_generat_grafic",
    "status_semnat",
    "status_primit",
    "status_atasat",
  ];
  if (!coloaneValide.includes(etapa)) return { success: false, message: "Etapa necunoscuta." };

  const { error } = await check.supabase
    .from("registru_contracte")
    .update({ [etapa]: valoare, data_ultimului_status: new Date().toISOString().slice(0, 10) })
    .eq("id", id);
  if (error) return { success: false, message: error.message };

  revalidatePath("/contracte/registru");
  return { success: true };
}

export async function stergeInregistrareRegistruAction(id: string): Promise<{ success: boolean; message?: string }> {
  const check = await requireAdminOrEditor();
  if (!check.ok) return { success: false, message: check.message };

  const { error } = await check.supabase.from("registru_contracte").delete().eq("id", id);
  if (error) return { success: false, message: error.message };

  revalidatePath("/contracte/registru");
  return { success: true };
}

/** Editeaza o inregistrare existenta - toate campurile, inclusiv numarul
 * de contract si datele de identificare (nu doar etapele de status). */
export async function actualizeazaInregistrareRegistruAction(
  id: string,
  payload: RegistruContractPayload & { nr_contract: number }
): Promise<{ success: boolean; message: string }> {
  const check = await requireAdminOrEditor();
  if (!check.ok) return { success: false, message: check.message };

  if (!payload.partner_id && !payload.partener_nume_liber?.trim()) {
    return { success: false, message: "Alege un partener sau introdu un nume." };
  }

  const { error } = await check.supabase
    .from("registru_contracte")
    .update({
      nr_contract: payload.nr_contract,
      tip_partener: payload.tip_partener,
      tip_document: payload.tip_document,
      data_contract: payload.data_contract,
      partner_id: payload.partner_id,
      partener_nume_liber: payload.partener_nume_liber,
      produs_serviciu_id: payload.produs_serviciu_id,
      serviciu_id: payload.serviciu_id,
      detalii_serviciu: payload.detalii_serviciu,
      contact_nume: payload.contact_nume,
      contact_email: payload.contact_email,
      contact_telefon: payload.contact_telefon,
      contact2_nume: payload.contact2_nume,
      contact2_email: payload.contact2_email,
      contact2_telefon: payload.contact2_telefon,
    })
    .eq("id", id);

  if (error) return { success: false, message: error.message };

  revalidatePath("/contracte/registru");
  return { success: true, message: "Salvat." };
}

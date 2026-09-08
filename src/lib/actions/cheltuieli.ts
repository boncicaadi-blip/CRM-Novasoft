"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runCheltuieliLiniiSync, regenerateCheltuialaContractLines } from "@/lib/cheltuieli-sync";
import type { StatusContractCheltuiala, TipCheltuiala, FrecventaCheltuiala } from "@/types/cheltuieli";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { supabase, isAdmin: false };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  return { supabase, isAdmin: profile?.role === "admin" };
}

function firstOfMonth(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

export async function syncCheltuieliLiniiAction(): Promise<{
  success: boolean;
  message?: string;
  data?: { generate: number };
}> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot sincroniza cheltuielile." };

  const result = await runCheltuieliLiniiSync(supabase);
  revalidatePath("/venituri-cheltuieli/cheltuieli");
  return { success: true, data: result };
}

export async function createContractCheltuialaAction(fields: {
  furnizor?: string | null;
  incadrare: string;
  clasa: string;
  detaliu?: string | null;
  tip_cheltuiala: TipCheltuiala;
  frecventa: FrecventaCheltuiala;
  investitie?: boolean;
  repartizare?: boolean;
  valoare_lunara: number;
  nr_rate?: number;
  data_inceput: string;
  data_sfarsit?: string | null;
  status_contract?: StatusContractCheltuiala;
  observatii?: string | null;
}): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot crea contracte." };

  if (!fields.incadrare || !fields.clasa) {
    return { success: false, message: "Incadrarea si clasa sunt obligatorii." };
  }
  if (fields.valoare_lunara <= 0) return { success: false, message: "Valoarea trebuie sa fie pozitiva." };

  const { data: created, error } = await supabase
    .from("contracte_cheltuieli")
    .insert({ ...fields, status_contract: fields.status_contract ?? "Activ" })
    .select("id")
    .single();
  if (error) return { success: false, message: error.message };

  await regenerateCheltuialaContractLines(supabase, created.id);

  revalidatePath("/venituri-cheltuieli/cheltuieli");
  return { success: true };
}

export async function updateContractCheltuialaAction(
  id: string,
  fields: {
    furnizor?: string | null;
    incadrare?: string;
    clasa?: string;
    detaliu?: string | null;
    tip_cheltuiala?: TipCheltuiala;
    frecventa?: FrecventaCheltuiala;
    investitie?: boolean;
    repartizare?: boolean;
    valoare_lunara?: number;
    nr_rate?: number;
    data_inceput?: string;
    data_sfarsit?: string | null;
    status_contract?: StatusContractCheltuiala;
    observatii?: string | null;
  }
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot edita contracte." };

  const { error } = await supabase.from("contracte_cheltuieli").update(fields).eq("id", id);
  if (error) return { success: false, message: error.message };

  await regenerateCheltuialaContractLines(supabase, id);

  revalidatePath("/venituri-cheltuieli/cheltuieli");
  return { success: true };
}

export async function deleteContractCheltuialaAction(id: string): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot sterge contracte." };

  const { error } = await supabase.from("contracte_cheltuieli").delete().eq("id", id);
  if (error) return { success: false, message: error.message };

  revalidatePath("/venituri-cheltuieli/cheltuieli");
  return { success: true };
}

export async function addCheltuialaLinieManualAction(fields: {
  furnizor?: string | null;
  incadrare: string;
  clasa: string;
  detaliu?: string | null;
  frecventa: FrecventaCheltuiala;
  luna: string;
  valoare_prognozata: number;
  observatii?: string | null;
}): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot adauga cheltuieli." };

  if (!fields.incadrare || !fields.clasa) {
    return { success: false, message: "Incadrarea si clasa sunt obligatorii." };
  }
  if (fields.valoare_prognozata <= 0) return { success: false, message: "Valoarea trebuie sa fie pozitiva." };

  const { error } = await supabase.from("cheltuieli_linii").insert({
    furnizor: fields.furnizor ?? null,
    incadrare: fields.incadrare,
    clasa: fields.clasa,
    detaliu: fields.detaliu ?? null,
    frecventa: fields.frecventa,
    luna: firstOfMonth(fields.luna),
    valoare_prognozata: fields.valoare_prognozata,
    observatii: fields.observatii ?? null,
    contract_id: null,
    platit: false,
    valoare_realizata: null,
  });
  if (error) return { success: false, message: error.message };

  revalidatePath("/venituri-cheltuieli/cheltuieli");
  return { success: true };
}

export async function updateCheltuialaLinieAction(
  id: string,
  fields: {
    incadrare?: string;
    clasa?: string;
    detaliu?: string | null;
    luna?: string;
    valoare_prognozata?: number;
    valoare_realizata?: number | null;
    platit?: boolean;
    observatii?: string | null;
  }
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot edita cheltuieli." };

  const { error } = await supabase.from("cheltuieli_linii").update(fields).eq("id", id);
  if (error) return { success: false, message: error.message };

  revalidatePath("/venituri-cheltuieli/cheltuieli");
  return { success: true };
}

export async function deleteCheltuialaLinieAction(id: string): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot sterge cheltuieli." };

  const { error } = await supabase.from("cheltuieli_linii").delete().eq("id", id);
  if (error) return { success: false, message: error.message };

  revalidatePath("/venituri-cheltuieli/cheltuieli");
  return { success: true };
}

export async function deleteCheltuieliLiniiAction(ids: string[]): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot sterge cheltuieli." };
  if (ids.length === 0) return { success: true };

  const { error } = await supabase.from("cheltuieli_linii").delete().in("id", ids);
  if (error) return { success: false, message: error.message };

  revalidatePath("/venituri-cheltuieli/cheltuieli");
  return { success: true };
}

export async function bulkMarkPlatitAction(ids: string[]): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot edita cheltuieli." };
  if (ids.length === 0) return { success: true };

  const { data: linii, error: fetchError } = await supabase
    .from("cheltuieli_linii")
    .select("id, valoare_prognozata")
    .in("id", ids);
  if (fetchError) return { success: false, message: fetchError.message };

  for (const linie of linii ?? []) {
    await supabase
      .from("cheltuieli_linii")
      .update({ platit: true, valoare_realizata: linie.valoare_prognozata })
      .eq("id", linie.id);
  }

  revalidatePath("/venituri-cheltuieli/cheltuieli");
  return { success: true };
}

/**
 * Inversul lui bulkMarkPlatitAction - scoate bifa de platit si reseteaza
 * valoare_realizata la 0.
 */
export async function bulkUnmarkPlatitAction(ids: string[]): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot edita cheltuieli." };
  if (ids.length === 0) return { success: true };

  const { error } = await supabase
    .from("cheltuieli_linii")
    .update({ platit: false, valoare_realizata: 0 })
    .in("id", ids);

  if (error) return { success: false, message: error.message };

  revalidatePath("/venituri-cheltuieli/cheltuieli");
  return { success: true };
}

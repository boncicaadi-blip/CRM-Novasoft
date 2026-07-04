"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { runVenituriLiniiSync } from "@/lib/venituri-sync";
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
 * Server Action pentru butonul "Genereaza linii lipsa" - apeleaza logica
 * pura din venituri-sync.ts, apoi invalideaza cache-ul. Aceeasi logica e
 * apelata si direct din pagina (fara acest wrapper), la fiecare vizitare -
 * vezi src/app/(app)/venituri-cheltuieli/page.tsx.
 */
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
  nume_client: string;
  partner_id?: string | null;
  produs?: string | null;
  serviciu?: string | null;
  valoare_lunara: number;
  data_inceput: string;
  data_sfarsit?: string | null;
  stadiu_contract?: string | null;
  modalitate_facturare?: string | null;
  observatii?: string | null;
}): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot crea contracte." };

  if (!fields.nume_client.trim()) return { success: false, message: "Numele clientului e obligatoriu." };
  if (fields.valoare_lunara <= 0) return { success: false, message: "Valoarea lunara trebuie sa fie pozitiva." };

  const { error } = await supabase.from("contracte").insert({ ...fields, status: "Activ" });
  if (error) return { success: false, message: error.message };

  await runVenituriLiniiSync(supabase);

  revalidatePath("/venituri-cheltuieli");
  return { success: true };
}

export async function updateContractAction(
  id: string,
  fields: {
    nume_client?: string;
    produs?: string | null;
    serviciu?: string | null;
    valoare_lunara?: number;
    data_sfarsit?: string | null;
    status?: ContractStatus;
    stadiu_contract?: string | null;
    modalitate_facturare?: string | null;
    observatii?: string | null;
  }
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot edita contracte." };

  const { error } = await supabase.from("contracte").update(fields).eq("id", id);
  if (error) return { success: false, message: error.message };

  if (fields.status === "Activ") {
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

/** Adauga o linie de venit NERECURENT, introdusa manual (fara contract). */
export async function addVenitNerecurentAction(fields: {
  nume_client: string;
  partner_id?: string | null;
  produs?: string | null;
  serviciu?: string | null;
  luna: string;
  venit_estimat: number;
  observatii?: string | null;
}): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot adauga venituri." };

  if (!fields.nume_client.trim()) return { success: false, message: "Numele clientului e obligatoriu." };
  if (fields.venit_estimat <= 0) return { success: false, message: "Valoarea trebuie sa fie pozitiva." };

  const { error } = await supabase.from("venituri_linii").insert({
    ...fields,
    luna: firstOfMonth(fields.luna),
    tip_venit: "Nerecurent" as TipVenit,
    contract_id: null,
  });
  if (error) return { success: false, message: error.message };

  revalidatePath("/venituri-cheltuieli");
  return { success: true };
}

/** Editeaza venitul realizat (si optional Facturat/Observatii) pe orice linie. */
export async function updateVenitLinieAction(
  id: string,
  fields: {
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

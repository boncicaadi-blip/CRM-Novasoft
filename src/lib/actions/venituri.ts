"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getTodayISO } from "@/lib/date";
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

/** Toate lunile (prima zi a lunii, format YYYY-MM-DD) intre doua date, inclusiv. */
function monthsBetween(startStr: string, endStr: string): string[] {
  const start = new Date(`${firstOfMonth(startStr)}T00:00:00Z`);
  const end = new Date(`${firstOfMonth(endStr)}T00:00:00Z`);
  const months: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    months.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

/**
 * Genereaza liniile de venit lipsa pentru TOATE contractele active - de la
 * data_inceput pana la (data_sfarsit sau luna curenta + 1 luna buffer).
 * Idempotent: nu duplica lunile deja generate (verificate prin contract_id +
 * luna). Foloseste mereu valoarea CURENTA a contractului - lunile deja
 * generate anterior raman neatinse, indiferent cate ori se schimba valoarea
 * ulterior.
 */
export async function syncVenituriLiniiAction(): Promise<{
  success: boolean;
  message?: string;
  data?: { generate: number };
}> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot sincroniza veniturile." };

  const { data: contracte, error: contracteError } = await supabase
    .from("contracte")
    .select("*")
    .eq("status", "Activ");

  if (contracteError) return { success: false, message: contracteError.message };

  const today = new Date(`${getTodayISO()}T00:00:00Z`);
  const bufferEnd = new Date(today);
  bufferEnd.setUTCMonth(bufferEnd.getUTCMonth() + 1);
  const bufferEndStr = bufferEnd.toISOString().slice(0, 10);

  let totalGenerate = 0;

  for (const contract of contracte ?? []) {
    const dataSfarsit = contract.data_sfarsit && contract.data_sfarsit < bufferEndStr
      ? contract.data_sfarsit
      : bufferEndStr;

    const luni = monthsBetween(contract.data_inceput, dataSfarsit);
    if (luni.length === 0) continue;

    const { data: existente } = await supabase
      .from("venituri_linii")
      .select("luna")
      .eq("contract_id", contract.id);

    const existenteSet = new Set((existente ?? []).map((r) => r.luna));
    const deGenerat = luni.filter((l) => !existenteSet.has(l));
    if (deGenerat.length === 0) continue;

    const rows = deGenerat.map((luna) => ({
      contract_id: contract.id,
      partner_id: contract.partner_id,
      nume_client: contract.nume_client,
      tip_venit: "Recurent" as TipVenit,
      produs: contract.produs,
      serviciu: contract.serviciu,
      luna,
      venit_estimat: contract.valoare_lunara,
      venit_realizat: null,
      facturat: false,
    }));

    const { error: insertError } = await supabase.from("venituri_linii").insert(rows);
    if (!insertError) totalGenerate += rows.length;
  }

  revalidatePath("/venituri-cheltuieli");
  return { success: true, data: { generate: totalGenerate } };
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

  await syncVenituriLiniiAction();

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
    await syncVenituriLiniiAction();
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

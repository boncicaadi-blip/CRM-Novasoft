"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createNomenclator,
  updateNomenclator,
  deleteNomenclator,
} from "@/lib/data/nomenclatoare";
import type { NomenclatorCategorie } from "@/types/opportunity";

/** Nomenclatoarele pot fi citite de oricine (dropdown-uri in formulare din
 * mai multe module), dar scrise doar de admin - la fel ca pagina de Setari
 * care le gestioneaza, vizibila doar adminilor. */
async function requireAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) throw new Error("Trebuie sa fii autentificat.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profile?.role !== "admin") {
    throw new Error("Doar administratorii pot modifica nomenclatoarele.");
  }
}

export async function createNomenclatorAction(formData: FormData) {
  await requireAdmin();

  const categorie = formData.get("categorie") as NomenclatorCategorie;
  const valoare = (formData.get("valoare") as string)?.trim();
  const culoare = (formData.get("culoare") as string) || null;
  const probabilityRaw = formData.get("probability") as string;
  const probability = probabilityRaw ? Number(probabilityRaw) : null;
  const ordineRaw = formData.get("ordine") as string;
  const ordine = ordineRaw ? Number(ordineRaw) : 0;

  if (!categorie || !valoare) {
    throw new Error("Categoria si valoarea sunt obligatorii.");
  }

  await createNomenclator({ categorie, valoare, culoare, probability, ordine });
  revalidatePath("/setari/nomenclatoare");
  revalidatePath("/oportunitati/noua");
}

export async function updateNomenclatorAction(id: string, formData: FormData) {
  await requireAdmin();

  const valoare = formData.get("valoare") as string;
  const culoare = (formData.get("culoare") as string) || null;
  const probabilityRaw = formData.get("probability") as string;
  const probability = probabilityRaw ? Number(probabilityRaw) : null;
  const ordineRaw = formData.get("ordine") as string;
  const ordine = ordineRaw ? Number(ordineRaw) : 0;

  await updateNomenclator(id, { valoare, culoare, probability, ordine });
  revalidatePath("/setari/nomenclatoare");
}

export async function toggleNomenclatorActivAction(id: string, activ: boolean) {
  await requireAdmin();
  await updateNomenclator(id, { activ });
  revalidatePath("/setari/nomenclatoare");
}

export async function deleteNomenclatorAction(id: string) {
  await requireAdmin();
  await deleteNomenclator(id);
  revalidatePath("/setari/nomenclatoare");
}

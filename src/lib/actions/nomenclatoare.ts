"use server";

import { revalidatePath } from "next/cache";
import {
  createNomenclator,
  updateNomenclator,
  deleteNomenclator,
} from "@/lib/data/nomenclatoare";
import type { NomenclatorCategorie } from "@/types/opportunity";

export async function createNomenclatorAction(formData: FormData) {
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
  await updateNomenclator(id, { activ });
  revalidatePath("/setari/nomenclatoare");
}

export async function deleteNomenclatorAction(id: string) {
  await deleteNomenclator(id);
  revalidatePath("/setari/nomenclatoare");
}

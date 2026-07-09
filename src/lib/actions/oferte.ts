"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB, in linie cu limita crescuta din next.config.ts

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

/**
 * Ataseaza o oferta PDF noua unei oportunitati. Numarul de versiune se
 * calculeaza automat (maximul existent + 1) - fiecare reofertare adauga o
 * versiune noua, nu suprascrie nimic din istoric.
 */
export async function uploadOfertaAction(
  opportunityId: string,
  formData: FormData
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false, message: "Trebuie sa fii autentificat." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: "Selecteaza un fisier PDF." };
  }
  if (file.type !== "application/pdf") {
    return { success: false, message: "Doar fisiere PDF sunt acceptate." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { success: false, message: "Fisierul depaseste 15MB." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("opportunity_oferte")
    .select("versiune")
    .eq("opportunity_id", opportunityId)
    .order("versiune", { ascending: false })
    .limit(1);

  if (existingError) return { success: false, message: existingError.message };

  const nextVersion = (existing?.[0]?.versiune ?? 0) + 1;
  const storagePath = `${opportunityId}/v${nextVersion}_${Date.now()}_${sanitizeFileName(file.name)}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from("oferte").upload(storagePath, arrayBuffer, {
    contentType: "application/pdf",
    upsert: false,
  });

  if (uploadError) return { success: false, message: uploadError.message };

  const { error: insertError } = await supabase.from("opportunity_oferte").insert({
    opportunity_id: opportunityId,
    versiune: nextVersion,
    nume_fisier: file.name,
    storage_path: storagePath,
    marime_bytes: file.size,
    creat_de: userData.user.id,
  });

  if (insertError) {
    // Nu lasam un fisier "orfan" in storage daca inregistrarea de metadate esueaza.
    await supabase.storage.from("oferte").remove([storagePath]);
    return { success: false, message: insertError.message };
  }

  revalidatePath(`/oportunitati/${opportunityId}`);
  return { success: true };
}

export async function deleteOfertaAction(
  ofertaId: string,
  opportunityId: string,
  storagePath: string
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false, message: "Trebuie sa fii autentificat." };

  const { error: deleteRowError } = await supabase.from("opportunity_oferte").delete().eq("id", ofertaId);
  if (deleteRowError) return { success: false, message: deleteRowError.message };

  const { error: deleteFileError } = await supabase.storage.from("oferte").remove([storagePath]);
  if (deleteFileError) {
    // Metadata a fost deja stearsa - semnalam eroarea de storage, dar nu o
    // tratam ca esec total (fisierul ramas orfan in bucket nu e vizibil
    // nicaieri in aplicatie, poate fi curatat manual mai tarziu daca e cazul).
    console.error("deleteOfertaAction storage cleanup error:", deleteFileError.message);
  }

  revalidatePath(`/oportunitati/${opportunityId}`);
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { updateTermeneCredentials } from "@/lib/data/apiCredentials";

export async function updateTermeneCredentialsAction(formData: FormData) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false, message: "Trebuie sa fii autentificat." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  if (profile?.role !== "admin") {
    return { success: false, message: "Doar administratorii pot modifica aceste credentiale." };
  }

  const username = (formData.get("username") as string)?.trim();
  const password = (formData.get("password") as string)?.trim();
  const schemaKey = (formData.get("schemaKey") as string)?.trim();

  if (!username || !password || !schemaKey) {
    return { success: false, message: "Toate cele 3 campuri sunt obligatorii." };
  }

  try {
    await updateTermeneCredentials({ username, password, schemaKey });
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Eroare la salvare." };
  }

  revalidatePath("/setari/integrari");
  return { success: true, message: "Credentiale salvate." };
}

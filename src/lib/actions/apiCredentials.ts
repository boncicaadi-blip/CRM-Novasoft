"use server";

import { revalidatePath } from "next/cache";
import { updateTermeneCredentials } from "@/lib/data/apiCredentials";

export async function updateTermeneCredentialsAction(formData: FormData) {
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

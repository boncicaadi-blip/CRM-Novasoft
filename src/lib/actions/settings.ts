"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateTargetComercialAction(
  value: number | null
): Promise<{ success: boolean; message?: string }> {
  if (value !== null && (Number.isNaN(value) || value < 0)) {
    return { success: false, message: "Valoarea targetului trebuie sa fie un numar pozitiv." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData?.user?.id ?? "")
    .single();

  if (profile?.role !== "admin") {
    return { success: false, message: "Doar administratorii pot modifica targetul comercial." };
  }

  const { error } = await supabase
    .from("company_settings")
    .update({
      target_comercial: value,
      updated_at: new Date().toISOString(),
      updated_by: userData?.user?.id ?? null,
    })
    .eq("id", 1);

  if (error) return { success: false, message: error.message };

  revalidatePath("/rapoarte");
  revalidatePath("/setari/comercial");
  return { success: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function upsertAngajatiLunarAction(
  an: number,
  luna: number,
  nrAngajati: number
): Promise<{ success: boolean; message?: string }> {
  if (!Number.isInteger(an) || an < 2000 || an > 2100) {
    return { success: false, message: "Anul nu este valid." };
  }
  if (!Number.isInteger(luna) || luna < 1 || luna > 12) {
    return { success: false, message: "Luna nu este valida." };
  }
  if (!Number.isInteger(nrAngajati) || nrAngajati < 0) {
    return { success: false, message: "Numarul de angajati trebuie sa fie un intreg pozitiv." };
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData?.user?.id ?? "")
    .single();

  if (profile?.role !== "admin") {
    return { success: false, message: "Doar administratorii pot modifica numarul de angajati." };
  }

  const { error } = await supabase
    .from("angajati_lunar")
    .upsert({ an, luna, nr_angajati: nrAngajati, actualizat_la: new Date().toISOString() }, { onConflict: "an,luna" });

  if (error) return { success: false, message: error.message };

  revalidatePath("/setari/angajati");
  revalidatePath("/management");
  return { success: true };
}

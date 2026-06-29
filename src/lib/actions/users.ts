"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) throw new Error("Neautentificat.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Acces interzis - doar adminii pot edita utilizatori.");

  return supabase;
}

export async function updateUserAction(
  userId: string,
  fullName: string,
  role: "admin" | "user"
): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = await assertAdmin();

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, role })
      .eq("id", userId);

    if (error) return { success: false, message: error.message };

    revalidatePath("/setari/utilizatori");
    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Eroare necunoscuta." };
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

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

  return { supabase, currentUserId: data.user.id };
}

/** Aproba un cont nou, dandu-i acces la aplicatie. */
export async function approveUserAction(
  userId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const { supabase } = await assertAdmin();

    const { error } = await supabase
      .from("profiles")
      .update({ approved: true })
      .eq("id", userId);

    if (error) return { success: false, message: error.message };

    revalidatePath("/setari/utilizatori");
    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Eroare necunoscuta." };
  }
}

/**
 * Dezactiveaza un cont deja aprobat - blocheaza accesul instant (aceeasi
 * poarta ca la aprobare: profiles.approved = false ii arata ecranul de
 * "in asteptare", indiferent daca e un cont nou sau unul dezactivat ulterior).
 * Nu sterge nimic - poate fi reaprobat oricand din acelasi ecran.
 */
export async function deactivateUserAction(
  userId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const { supabase, currentUserId } = await assertAdmin();
    if (userId === currentUserId) {
      return { success: false, message: "Nu iti poti dezactiva propriul cont." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({ approved: false })
      .eq("id", userId);

    if (error) return { success: false, message: error.message };

    revalidatePath("/setari/utilizatori");
    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Eroare necunoscuta." };
  }
}

/**
 * Sterge definitiv un cont (contul de autentificare, nu doar randul din
 * profiles) - foloseste API-ul de admin al Supabase (cheia de service-role),
 * singura care poate sterge un user din auth.users. Profilul se sterge
 * automat, in cascada (profiles.id -> auth.users.id on delete cascade).
 */
export async function deleteUserAction(
  userId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const { currentUserId } = await assertAdmin();
    if (userId === currentUserId) {
      return { success: false, message: "Nu iti poti sterge propriul cont." };
    }

    const serviceClient = createServiceClient();
    const { error } = await serviceClient.auth.admin.deleteUser(userId);
    if (error) return { success: false, message: error.message };

    revalidatePath("/setari/utilizatori");
    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Eroare necunoscuta." };
  }
}

export async function updateUserAction(
  userId: string,
  fullName: string,
  role: "admin" | "editor" | "viewer",
  moduleAccess: string[],
  submoduleAccess: string[] = []
): Promise<{ success: boolean; message?: string }> {
  try {
    const { supabase } = await assertAdmin();

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, role, module_access: moduleAccess, submodule_access: submoduleAccess })
      .eq("id", userId);

    if (error) return { success: false, message: error.message };

    revalidatePath("/setari/utilizatori");
    return { success: true };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Eroare necunoscuta." };
  }
}

/** Fiecare user isi poate schimba doar propria preferinta de tema. */
export async function updateThemePreferenceAction(
  theme: "light" | "dark" | "system"
): Promise<{ success: boolean; message?: string }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) return { success: false, message: "Neautentificat." };

  const { error } = await supabase
    .from("profiles")
    .update({ theme })
    .eq("id", data.user.id);

  if (error) return { success: false, message: error.message };
  return { success: true };
}

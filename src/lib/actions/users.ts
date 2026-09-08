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

/** Adminul poate activa/dezactiva popup-ul zilnic pentru orice utilizator,
 * direct din lista de Utilizatori. */
export async function togglePopupZilnicAction(
  userId: string,
  arataPopup: boolean
): Promise<{ success: boolean; message?: string }> {
  try {
    const { supabase } = await assertAdmin();

    const { error } = await supabase
      .from("profiles")
      .update({ arata_popup_zilnic: arataPopup })
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

/**
 * Trimite un email fiecarui admin cand se inregistreaza un cont nou, ca sa
 * stie ca are ceva de aprobat. Apelata direct dupa `auth.signUp()` reusit,
 * de pe pagina de login/inregistrare - userul nu are inca sesiune activa
 * (necesita confirmare email + aprobare admin), deci foloseste clientul cu
 * rol de serviciu (bypass RLS), nu clientul normal.
 */
export async function notificaAdminiUtilizatorNou(payload: {
  email: string;
  fullName: string;
}): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { data: admini } = await supabase.from("profiles").select("email").eq("role", "admin");
    if (!admini || admini.length === 0) return;

    const { trimiteEmail } = await import("@/lib/email/resend");
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.nova-soft.ro";

    await Promise.all(
      admini
        .filter((a) => a.email)
        .map((a) =>
          trimiteEmail({
            to: a.email as string,
            subject: "Cont nou, in asteptarea aprobarii",
            from: "Novasoft CRM <notificari@nova-soft.ro>",
            html: `
              <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #E8007A;">Cont nou creat</h2>
                <p><strong>${payload.fullName}</strong> (${payload.email}) si-a creat un cont si asteapta aprobarea ta.</p>
                <a href="${APP_URL}/setari/utilizatori" style="display: inline-block; background: #E8007A; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
                  Vezi si aproba contul
                </a>
              </div>
            `,
          })
        )
    );
  } catch (err) {
    console.error("notificaAdminiUtilizatorNou error:", err);
  }
}

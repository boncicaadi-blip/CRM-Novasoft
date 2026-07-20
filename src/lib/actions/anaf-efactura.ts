"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ANAF_AUTHORIZE_URL = "https://logincert.anaf.ro/anaf-oauth2/v1/authorize";

// Domeniul de productie e cunoscut si fix - poate fi suprascris printr-o
// variabila de mediu daca se testeaza vreodata pe alt domeniu.
const REDIRECT_URI = process.env.ANAF_REDIRECT_URI ?? "https://crm.nova-soft.ro/api/anaf/callback";

interface AnafExtra {
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  connected_at?: string;
}

async function requireAdminSupabase() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { ok: false as const, message: "Trebuie sa fii autentificat." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  if (profile?.role !== "admin") {
    return { ok: false as const, message: "Doar administratorii pot gestiona conexiunea SPV." };
  }
  return { ok: true as const, supabase, userId: userData.user.id };
}

/**
 * Salveaza Client ID / Client Secret generate din profilul OAuth ANAF
 * (Setari -> Integrari). Nu porneste conexiunea propriu-zisa - doar
 * pregateste datele necesare pentru pasul de autorizare (butonul
 * "Conecteaza SPV", care apare abia dupa ce aceste doua campuri exista).
 */
export async function saveAnafClientCredentialsAction(
  formData: FormData
): Promise<{ success: boolean; message?: string }> {
  const check = await requireAdminSupabase();
  if (!check.ok) return { success: false, message: check.message };

  const clientId = (formData.get("clientId") as string)?.trim();
  const clientSecret = (formData.get("clientSecret") as string)?.trim();

  if (!clientId || !clientSecret) {
    return { success: false, message: "Client ID si Client Secret sunt obligatorii." };
  }

  const { error } = await check.supabase
    .from("api_credentials")
    .upsert({ id: "anaf", username: clientId, password: clientSecret, updated_by: check.userId, updated_at: new Date().toISOString() });

  if (error) return { success: false, message: error.message };

  revalidatePath("/setari/integrari");
  return { success: true, message: "Client ID si Secret salvate. Poti da click pe Conecteaza SPV." };
}

/**
 * Construieste URL-ul de autorizare ANAF, catre care browser-ul trebuie
 * redirectionat - acolo se cere certificatul digital. Esueaza cu un mesaj
 * clar daca Client ID nu a fost inca salvat.
 */
export async function getAnafAuthorizeUrlAction(): Promise<
  { success: true; url: string } | { success: false; message: string }
> {
  const check = await requireAdminSupabase();
  if (!check.ok) return { success: false, message: check.message };

  const { data } = await check.supabase.from("api_credentials").select("username").eq("id", "anaf").single();
  if (!data?.username) {
    return { success: false, message: "Completeaza mai intai Client ID / Client Secret mai jos." };
  }

  const url = new URL(ANAF_AUTHORIZE_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", data.username);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("token_content_type", "jwt");

  return { success: true, url: url.toString() };
}

/** Sterge tokenul salvat (deconectare) - Client ID/Secret raman, doar conexiunea se reseteaza. */
export async function disconnectAnafAction(): Promise<{ success: boolean; message?: string }> {
  const check = await requireAdminSupabase();
  if (!check.ok) return { success: false, message: check.message };

  const { data } = await check.supabase.from("api_credentials").select("extra").eq("id", "anaf").single();
  const currentExtra = (data?.extra as AnafExtra | null) ?? {};

  const { access_token: _access_token, refresh_token: _refresh_token, expires_at: _expires_at, ...rest } = currentExtra;
  void _access_token;
  void _refresh_token;
  void _expires_at;

  const { error } = await check.supabase
    .from("api_credentials")
    .update({ extra: rest, updated_by: check.userId, updated_at: new Date().toISOString() })
    .eq("id", "anaf");

  if (error) return { success: false, message: error.message };

  revalidatePath("/setari/integrari");
  return { success: true };
}

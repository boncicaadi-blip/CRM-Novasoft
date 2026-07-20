import { createClient } from "@/lib/supabase/server";
import type { AnafFactura, AnafConnectionStatus } from "@/types/anaf";

export async function getAnafFacturi(): Promise<AnafFactura[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anaf_facturi")
    .select("*")
    .order("descarcat_la", { ascending: false });

  if (error) {
    console.error("getAnafFacturi error:", error.message);
    return [];
  }
  return data as AnafFactura[];
}

interface AnafExtra {
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  connected_at?: string;
  cif?: string;
}

export async function getAnafConnectionStatus(): Promise<AnafConnectionStatus> {
  const supabase = await createClient();
  const { data } = await supabase.from("api_credentials").select("username, extra").eq("id", "anaf").single();

  const extra = (data?.extra as AnafExtra | null) ?? null;

  return {
    connected: Boolean(extra?.access_token),
    clientIdSet: Boolean(data?.username),
    connectedAt: extra?.connected_at ?? null,
    expiresAt: extra?.expires_at ?? null,
    cif: extra?.cif ?? null,
  };
}

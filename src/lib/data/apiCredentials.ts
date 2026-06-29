import { createClient } from "@/lib/supabase/server";

export interface TermeneCredentials {
  username: string | null;
  password: string | null;
  schemaKey: string | null;
}

export async function getTermeneCredentials(): Promise<TermeneCredentials> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("api_credentials")
    .select("username, password, extra")
    .eq("id", "termene")
    .single();

  if (error || !data) {
    return { username: null, password: null, schemaKey: null };
  }

  return {
    username: data.username,
    password: data.password,
    schemaKey: (data.extra as { schemaKey?: string } | null)?.schemaKey ?? null,
  };
}

export async function updateTermeneCredentials(creds: {
  username: string;
  password: string;
  schemaKey: string;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("api_credentials")
    .update({
      username: creds.username,
      password: creds.password,
      extra: { schemaKey: creds.schemaKey },
      updated_at: new Date().toISOString(),
      updated_by: userData?.user?.id,
    })
    .eq("id", "termene");

  if (error) throw new Error(error.message);
}

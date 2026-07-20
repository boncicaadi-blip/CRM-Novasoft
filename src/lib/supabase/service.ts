import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client Supabase cu cheia de service-role (bypaseaza RLS complet) -
 * folosit STRICT in contexte server-to-server de incredere (ex. job-uri
 * cron), niciodata expus catre client sau folosit ca raspuns la o cerere a
 * unui utilizator. Diferit de @/lib/supabase/server, care foloseste sesiunea
 * (cookie-urile) userului conectat si respecta RLS normal.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY nu este configurata - necesara pentru sincronizarea automata (cron). Adauga-o in Vercel -> Environment Variables (o gasesti in Supabase -> Project Settings -> API -> service_role)."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

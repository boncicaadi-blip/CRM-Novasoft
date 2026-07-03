import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ModuleKey } from "@/lib/modules";

/**
 * Verifica accesul la o pagina in functie de modulul mare din care face
 * parte. Adminii au mereu acces la tot. Userii non-admin au acces doar
 * daca modulul apare in profiles.module_access.
 *
 * Redirect la /profil daca nu are acces - e singura pagina fara nicio
 * conditie de modul, deci mereu accesibila, evitand un loop de redirect.
 */
export async function requireModuleAccess(module: ModuleKey) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, module_access")
    .eq("id", data.user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const moduleAccess: string[] = profile?.module_access ?? [];

  if (!isAdmin && !moduleAccess.includes(module)) {
    redirect("/profil");
  }

  return { supabase, userId: data.user.id, isAdmin, moduleAccess };
}

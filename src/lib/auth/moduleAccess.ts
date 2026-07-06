import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasAccess, type ModuleKey } from "@/lib/modules";

/**
 * Verifica accesul la o pagina in functie de modulul mare din care face
 * parte, si optional de un submodul specific (ex: "venituri" din modulul
 * "venituri_cheltuieli"). Adminii au mereu acces la tot.
 *
 * Userii non-admin au acces daca:
 * - modulul intreg apare in profiles.module_access, SAU
 * - (daca s-a dat un submodul) submodulul specific apare in
 *   profiles.submodule_access.
 *
 * Redirect la /profil daca nu are acces - e singura pagina fara nicio
 * conditie de modul, deci mereu accesibila, evitand un loop de redirect.
 */
export async function requireModuleAccess(module: ModuleKey, submodule?: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data?.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, module_access, submodule_access")
    .eq("id", data.user.id)
    .single();

  const isAdmin = profile?.role === "admin";
  const moduleAccess: string[] = profile?.module_access ?? [];
  const submoduleAccess: string[] = profile?.submodule_access ?? [];

  if (!hasAccess(isAdmin, moduleAccess, submoduleAccess, module, submodule)) {
    redirect("/profil");
  }

  return { supabase, userId: data.user.id, isAdmin, moduleAccess, submoduleAccess };
}

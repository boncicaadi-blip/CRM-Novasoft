import { createClient } from "@/lib/supabase/server";
import type { Angajat, ConcediuCerere, ConcediuSold } from "@/types/concedii";

export async function getAngajatiList(): Promise<Angajat[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("angajati").select("*").order("nume", { ascending: true });
  if (error) {
    console.error("getAngajatiList error:", error.message);
    return [];
  }
  return data ?? [];
}

/** Angajatul legat de userul curent autentificat (via angajati.user_id) -
 * baza pentru "Cererile mele" si pentru verificarea daca esti managerul
 * cuiva. Null daca userul curent nu e asociat niciunui angajat. */
export async function getAngajatCurent(): Promise<Angajat | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return null;

  const { data, error } = await supabase.from("angajati").select("*").eq("user_id", userData.user.id).maybeSingle();
  if (error) {
    console.error("getAngajatCurent error:", error.message);
    return null;
  }
  return data;
}

export async function getConcediiCereri(): Promise<ConcediuCerere[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("concedii_cereri")
    .select("*")
    .order("data_inceput", { ascending: false });
  if (error) {
    console.error("getConcediiCereri error:", error.message);
    return [];
  }
  return data ?? [];
}

export async function getConcediiSold(): Promise<ConcediuSold[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("concedii_sold").select("*");
  if (error) {
    console.error("getConcediiSold error:", error.message);
    return [];
  }
  return data ?? [];
}

/** Marcheaza cererile deja rezolvate (aprobate/respinse) ale unui angajat
 * ca "vazute" - apelat cand angajatul chiar vizualizeaza "Cererile mele",
 * ca sa dispara indicatorul de notificare din meniu. */
export async function marcheazaCererileVazute(angajatId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("concedii_cereri")
    .update({ vazut_de_solicitant: true })
    .eq("angajat_id", angajatId)
    .eq("vazut_de_solicitant", false)
    .neq("status", "in_asteptare");
}

/** Cate cereri au un raspuns (aprobat/respins) inca nevazut de solicitant -
 * pentru badge-ul de pe "Cererile mele" in meniu. */
export async function getCereriNecititite(): Promise<number> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return 0;

  const { data: angajat } = await supabase
    .from("angajati")
    .select("id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!angajat) return 0;

  const { count } = await supabase
    .from("concedii_cereri")
    .select("id", { count: "exact", head: true })
    .eq("angajat_id", angajat.id)
    .eq("vazut_de_solicitant", false)
    .neq("status", "in_asteptare");

  return count ?? 0;
}

/** Cate cereri asteapta aprobarea userului curent - pentru badge-ul de pe
 * "Aprobare cereri" in meniu. Admin/editor vede toate cererile in
 * asteptare; un manager obisnuit, doar ale subalternilor lui directi. */
export async function getCereriDeAprobatCount(): Promise<number> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return 0;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  const poateVedeaTot = profile?.role === "admin" || profile?.role === "editor";

  if (poateVedeaTot) {
    const { count } = await supabase
      .from("concedii_cereri")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_asteptare");
    return count ?? 0;
  }

  const { data: angajat } = await supabase
    .from("angajati")
    .select("id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!angajat) return 0;

  const { data: subalterni } = await supabase.from("angajati").select("id").eq("manager_id", angajat.id);
  const idUri = (subalterni ?? []).map((s) => s.id);
  if (idUri.length === 0) return 0;

  const { count } = await supabase
    .from("concedii_cereri")
    .select("id", { count: "exact", head: true })
    .eq("status", "in_asteptare")
    .in("angajat_id", idUri);

  return count ?? 0;
}

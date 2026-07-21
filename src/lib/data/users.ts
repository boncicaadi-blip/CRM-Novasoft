import { createClient } from "@/lib/supabase/server";

/** Numarul de utilizatori care s-au inregistrat si si-au confirmat emailul, dar asteapta aprobarea unui admin. */
export async function getPendingUsersCount(): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("approved", false);

  if (error) {
    console.error("getPendingUsersCount error:", error.message);
    return 0;
  }
  return count ?? 0;
}

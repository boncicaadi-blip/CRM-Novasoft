import { createClient } from "@/lib/supabase/server";

export interface AngajatiLunarRow {
  an: number;
  luna: number;
  nr_angajati: number;
}

export async function getAngajatiLunar(): Promise<AngajatiLunarRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("angajati_lunar")
    .select("an, luna, nr_angajati")
    .order("an", { ascending: false })
    .order("luna", { ascending: true });

  if (error) {
    console.error("getAngajatiLunar error:", error.message);
    return [];
  }
  return data ?? [];
}

/** Numarul de angajati intr-o anumita luna (an, luna 1-12) - null daca nu e
 * completat inca. Cheia e "YYYY-MM", ca sa se potriveasca usor cu `luna`
 * din Venituri/Cheltuieli. */
export function buildAngajatiLookup(rows: AngajatiLunarRow[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(`${r.an}-${String(r.luna).padStart(2, "0")}`, r.nr_angajati);
  }
  return map;
}

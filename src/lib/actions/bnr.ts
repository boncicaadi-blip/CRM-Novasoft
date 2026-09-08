"use server";

import { createClient } from "@/lib/supabase/server";
import { fetchBnrYearRates } from "@/lib/bnr";

/**
 * Intoarce cursul BNR pentru o moneda la o data data. RON intoarce mereu 1,
 * fara niciun apel extern. Pentru restul, cauta intai in cache
 * (curs_valutar); daca lipseste, descarca tot anul respectiv de la BNR
 * (un singur fisier, toate zilele/monedele) si populeaza cache-ul, ca sa nu
 * mai fie nevoie de un nou apel pentru alte date din acelasi an.
 *
 * Daca data ceruta cade intr-un weekend/sarbatoare (BNR nu publica curs in
 * acele zile), se foloseste cel mai recent curs anterior disponibil.
 */
export async function getCursValutarAction(
  data: string,
  moneda: string
): Promise<{ success: boolean; curs?: number; dataCurs?: string; message?: string }> {
  if (moneda === "RON") return { success: true, curs: 1, dataCurs: data };

  const supabase = await createClient();

  const { data: exact } = await supabase
    .from("curs_valutar")
    .select("curs")
    .eq("data", data)
    .eq("moneda", moneda)
    .maybeSingle();

  if (exact) return { success: true, curs: Number(exact.curs), dataCurs: data };

  const year = Number(data.slice(0, 4));
  if (!year || year < 1999 || year > new Date().getFullYear() + 1) {
    return { success: false, message: "Data facturii nu este valida." };
  }

  try {
    const rows = await fetchBnrYearRates(year);
    if (rows.length > 0) {
      const maxData = rows.reduce((max, r) => (r.data > max ? r.data : max), rows[0].data);
      console.log(`fetchBnrYearRates(${year}): ${rows.length} randuri primite de la BNR, cea mai recenta data: ${maxData}`);
      const payload = rows.map((r) => ({ data: r.data, moneda: r.moneda, curs: r.curs }));
      const { error: upsertError } = await supabase
        .from("curs_valutar")
        .upsert(payload, { onConflict: "data,moneda" });
      if (upsertError) console.error("curs_valutar upsert error:", upsertError.message);
    } else {
      console.warn(`fetchBnrYearRates(${year}): 0 randuri primite de la BNR.`);
    }
  } catch (err) {
    return { success: false, message: err instanceof Error ? err.message : "Eroare la preluarea cursului BNR." };
  }

  const { data: nearest } = await supabase
    .from("curs_valutar")
    .select("curs, data")
    .eq("moneda", moneda)
    .lte("data", data)
    .order("data", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!nearest) {
    return { success: false, message: `Nu exista curs BNR pentru ${moneda} in jurul datei ${data}.` };
  }

  return { success: true, curs: Number(nearest.curs), dataCurs: nearest.data };
}

export interface CursIstoricRow {
  data: string;
  curs: number;
}

/**
 * Intoarce cursul BNR pentru toate zilele dintr-un an, pentru o moneda -
 * asigura intai ca anul e cachuit (il descarca de la BNR daca nu e), apoi
 * citeste tot din cache. Folosit pentru vizualizarea istoricului in
 * Setari -> Integrari.
 */
export async function getCursIstoricAnAction(
  moneda: string,
  an: number
): Promise<{ success: boolean; rows?: CursIstoricRow[]; message?: string }> {
  if (moneda === "RON") return { success: true, rows: [] };

  const supabase = await createClient();

  const { count } = await supabase
    .from("curs_valutar")
    .select("data", { count: "exact", head: true })
    .eq("moneda", moneda)
    .gte("data", `${an}-01-01`)
    .lte("data", `${an}-12-31`);

  // Anul curent primeste zilnic randuri noi de la BNR - nu ne putem baza pe
  // "exista deja ceva cache" ca sa stim ca e complet. Pentru anii trecuti
  // (inchisi, imutabili), cache-ul existent e suficient.
  const esteAnulCurent = an === new Date().getFullYear();

  if (!count || count === 0 || esteAnulCurent) {
    try {
      const rows = await fetchBnrYearRates(an);
      if (rows.length > 0) {
        const payload = rows.map((r) => ({ data: r.data, moneda: r.moneda, curs: r.curs }));
        const { error: upsertError } = await supabase
          .from("curs_valutar")
          .upsert(payload, { onConflict: "data,moneda" });
        if (upsertError) console.error("curs_valutar upsert error:", upsertError.message);
      }
    } catch (err) {
      return { success: false, message: err instanceof Error ? err.message : "Eroare la preluarea cursului BNR." };
    }
  }

  const { data: istoric, error } = await supabase
    .from("curs_valutar")
    .select("data, curs")
    .eq("moneda", moneda)
    .gte("data", `${an}-01-01`)
    .lte("data", `${an}-12-31`)
    .order("data", { ascending: true });

  if (error) return { success: false, message: error.message };

  return { success: true, rows: (istoric ?? []).map((r) => ({ data: r.data, curs: Number(r.curs) })) };
}

/**
 * Verificare bulk, pe un interval de date (poate acoperi mai multi ani) -
 * asigura ca fiecare an implicat in interval e la zi in cache (anul curent
 * se reimprospateaza mereu, anii inchisi doar daca lipsesc complet), apoi
 * intoarce toate zilele cu curs publicat din intervalul cerut.
 */
export async function getCursIstoricPerioadaAction(
  moneda: string,
  dataStart: string,
  dataEnd: string
): Promise<{ success: boolean; rows?: CursIstoricRow[]; message?: string }> {
  if (moneda === "RON") return { success: true, rows: [] };
  if (dataStart > dataEnd) return { success: false, message: "Data de inceput trebuie sa fie inainte de data de sfarsit." };

  const supabase = await createClient();
  const anStart = Number(dataStart.slice(0, 4));
  const anEnd = Number(dataEnd.slice(0, 4));
  const anCurent = new Date().getFullYear();

  if (anEnd - anStart > 10) {
    return { success: false, message: "Intervalul e prea mare (maxim 10 ani deodata)." };
  }

  for (let an = anStart; an <= anEnd; an++) {
    const { count } = await supabase
      .from("curs_valutar")
      .select("data", { count: "exact", head: true })
      .eq("moneda", moneda)
      .gte("data", `${an}-01-01`)
      .lte("data", `${an}-12-31`);

    const esteAnulCurent = an === anCurent;
    if (!count || count === 0 || esteAnulCurent) {
      try {
        const rows = await fetchBnrYearRates(an);
        if (rows.length > 0) {
          const payload = rows.map((r) => ({ data: r.data, moneda: r.moneda, curs: r.curs }));
          const { error: upsertError } = await supabase
            .from("curs_valutar")
            .upsert(payload, { onConflict: "data,moneda" });
          if (upsertError) console.error("curs_valutar upsert error:", upsertError.message);
        }
      } catch (err) {
        return { success: false, message: err instanceof Error ? err.message : `Eroare la preluarea cursului BNR pentru ${an}.` };
      }
    }
  }

  const { data: istoric, error } = await supabase
    .from("curs_valutar")
    .select("data, curs")
    .eq("moneda", moneda)
    .gte("data", dataStart)
    .lte("data", dataEnd)
    .order("data", { ascending: true });

  if (error) return { success: false, message: error.message };

  return { success: true, rows: (istoric ?? []).map((r) => ({ data: r.data, curs: Number(r.curs) })) };
}

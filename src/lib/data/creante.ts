import { createClient } from "@/lib/supabase/server";
import type { Creanta, CreanteImportBatch, CreantaIncasare } from "@/types/creante";

/**
 * Supabase/PostgREST limiteaza implicit orice select la 1000 de randuri,
 * indiferent cate exista in tabel - fara paginare explicita, orice peste
 * 1000 de facturi era pur si simplu invizibil in aplicatie. Aducem toate
 * paginile, indiferent cate sunt.
 */
async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const pageSize = 1000;
  let allRows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error) {
      console.error("fetchAllRows error:", error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

/**
 * Supabase/PostgREST serializeaza coloanele `numeric` ca STRING (nu ca
 * numar JSON), ca sa nu piarda precizie - daca nu le convertim explicit,
 * orice adunare gen `total += c.sold` face concatenare de text in loc de
 * suma, iar totalurile ies gresite. Normalizam o singura data, la citire.
 */
function normalizeCreanta(row: Record<string, unknown>): Creanta {
  return {
    ...row,
    total_factura: Number(row.total_factura) || 0,
    valoare_incasata: Number(row.valoare_incasata) || 0,
    sold: Number(row.sold) || 0,
    termen_incasare_zile: row.termen_incasare_zile === null ? null : Number(row.termen_incasare_zile),
    valoare_lunara_fara_tva:
      row.valoare_lunara_fara_tva === null ? null : Number(row.valoare_lunara_fara_tva),
    total_fara_tva: row.total_fara_tva === null ? null : Number(row.total_fara_tva),
    total_tva: row.total_tva === null ? null : Number(row.total_tva),
    valoare_propusa_spre_incasare:
      row.valoare_propusa_spre_incasare === null ? null : Number(row.valoare_propusa_spre_incasare),
  } as Creanta;
}

export async function getCreante(): Promise<Creanta[]> {
  const supabase = await createClient();
  const rows = await fetchAllRows<Record<string, unknown>>((from, to) =>
    supabase.from("creante").select("*").order("data_scadenta", { ascending: true }).range(from, to)
  );
  return rows.map(normalizeCreanta);
}

export async function getCreanteByFirma(nume: string): Promise<Creanta[]> {
  const supabase = await createClient();
  const rows = await fetchAllRows<Record<string, unknown>>((from, to) =>
    supabase
      .from("creante")
      .select("*")
      .eq("nume_firma", nume)
      .order("data_factura", { ascending: false })
      .range(from, to)
  );
  return rows.map(normalizeCreanta);
}

export async function getLastImportBatch(): Promise<CreanteImportBatch | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("creante_import_batches")
    .select("*")
    .order("importat_la", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getLastImportBatch error:", error.message);
    return null;
  }
  return data as CreanteImportBatch | null;
}

/** Toate incasarile, grupate pe creanta_id, cele mai recente primele. */
export async function getCreanteIncasari(): Promise<Record<string, CreantaIncasare[]>> {
  const supabase = await createClient();
  const rows = await fetchAllRows<CreantaIncasare>((from, to) =>
    supabase
      .from("creante_incasari")
      .select("*")
      .order("data_incasare", { ascending: false })
      .range(from, to)
  );

  const grouped: Record<string, CreantaIncasare[]> = {};
  for (const row of rows) {
    (grouped[row.creanta_id] ??= []).push({ ...row, valoare: Number(row.valoare) || 0 });
  }
  return grouped;
}

import { createClient } from "@/lib/supabase/server";
import type { Obligatie, ObligatiiImportBatch, ObligatiePlata } from "@/types/obligatii";

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

function normalizeObligatie(row: Record<string, unknown>): Obligatie {
  return {
    ...row,
    total_factura: Number(row.total_factura) || 0,
    valoare_platita: Number(row.valoare_platita) || 0,
    sold: Number(row.sold) || 0,
  } as Obligatie;
}

export async function getObligatii(): Promise<Obligatie[]> {
  const supabase = await createClient();
  const rows = await fetchAllRows<Record<string, unknown>>((from, to) =>
    supabase
      .from("obligatii")
      .select("*")
      .order("data_scadenta", { ascending: true })
      .range(from, to)
  );
  return rows.map(normalizeObligatie);
}

export async function getObligatiiByFurnizor(nume: string): Promise<Obligatie[]> {
  const supabase = await createClient();
  const rows = await fetchAllRows<Record<string, unknown>>((from, to) =>
    supabase
      .from("obligatii")
      .select("*")
      .eq("nume_furnizor", nume)
      .order("data_factura", { ascending: false })
      .range(from, to)
  );
  return rows.map(normalizeObligatie);
}

export async function getLastObligatiiImportBatch(): Promise<ObligatiiImportBatch | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("obligatii_import_batches")
    .select("*")
    .order("importat_la", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("getLastObligatiiImportBatch error:", error.message);
    return null;
  }
  return data as ObligatiiImportBatch | null;
}

/** Toate platile, grupate pe obligatie_id, cele mai recente primele. */
export async function getObligatiiPlati(): Promise<Record<string, ObligatiePlata[]>> {
  const supabase = await createClient();
  const rows = await fetchAllRows<ObligatiePlata>((from, to) =>
    supabase
      .from("obligatii_plati")
      .select("*")
      .order("data_plata", { ascending: false })
      .range(from, to)
  );

  const grouped: Record<string, ObligatiePlata[]> = {};
  for (const row of rows) {
    (grouped[row.obligatie_id] ??= []).push({ ...row, valoare: Number(row.valoare) || 0 });
  }
  return grouped;
}

import { createClient } from "@/lib/supabase/server";
import type { Contract, VenitLinie } from "@/types/venituri";

export interface ClientOption {
  id: string;
  nume: string;
  cod_fiscal: string | null;
  domeniul_activitate: string | null;
  judet: string | null;
  oras: string | null;
  opportunity_id: string | null;
}

/**
 * Lista de clienti pentru selectorul din formularul de contract - din
 * `partners`, nu direct din oportunitati. O firma cu mai multe oportunitati
 * (vanzari separate) are un singur partener, deci apare o singura data aici,
 * indiferent de cate oportunitati facturabile are in spate.
 *
 * Bifa "Facturabil" se pune tot din fisa oportunitatii (loc familiar), dar
 * se propaga automat pe partenerul corespunzator - vezi
 * updateOpportunitySectionAction din actions/opportunities.ts.
 */
export async function getClientOptions(): Promise<ClientOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partners")
    .select("id, nume, cod_fiscal, domeniul_activitate, judet, oras, opportunity_id")
    .eq("facturabil", true)
    .order("nume", { ascending: true });

  if (error) {
    console.error("getClientOptions error:", error.message);
    return [];
  }
  return data ?? [];
}

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

function normalizeContract(row: Record<string, unknown>): Contract {
  return { ...row, valoare_lunara: Number(row.valoare_lunara) || 0 } as Contract;
}

function normalizeVenitLinie(row: Record<string, unknown>): VenitLinie {
  return {
    ...row,
    venit_estimat: Number(row.venit_estimat) || 0,
    venit_realizat: row.venit_realizat === null ? null : Number(row.venit_realizat),
  } as VenitLinie;
}

export async function getContracte(): Promise<Contract[]> {
  const supabase = await createClient();
  const rows = await fetchAllRows<Record<string, unknown>>((from, to) =>
    supabase.from("contracte").select("*").order("nume_client", { ascending: true }).range(from, to)
  );
  return rows.map(normalizeContract);
}

export async function getVenituriLinii(): Promise<VenitLinie[]> {
  const supabase = await createClient();
  const rows = await fetchAllRows<Record<string, unknown>>((from, to) =>
    supabase.from("venituri_linii").select("*").order("luna", { ascending: false }).range(from, to)
  );
  return rows.map(normalizeVenitLinie);
}

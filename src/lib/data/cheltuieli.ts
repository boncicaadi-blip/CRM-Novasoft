import { createClient } from "@/lib/supabase/server";
import type { ContractCheltuiala, CheltuialaLinie } from "@/types/cheltuieli";

async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const pageSize = 1000;
  let allRows: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error) {
      console.error("fetchAllRows (cheltuieli) error:", error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allRows = allRows.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allRows;
}

function normalizeContract(row: Record<string, unknown>): ContractCheltuiala {
  return { ...row, valoare_lunara: Number(row.valoare_lunara) || 0 } as ContractCheltuiala;
}

function normalizeLinie(row: Record<string, unknown>): CheltuialaLinie {
  return {
    ...row,
    valoare_prognozata: Number(row.valoare_prognozata) || 0,
    valoare_realizata: row.valoare_realizata === null ? null : Number(row.valoare_realizata),
  } as CheltuialaLinie;
}

export async function getContracteCheltuieli(): Promise<ContractCheltuiala[]> {
  const supabase = await createClient();
  const rows = await fetchAllRows<Record<string, unknown>>((from, to) =>
    supabase.from("contracte_cheltuieli").select("*").order("incadrare", { ascending: true }).range(from, to)
  );
  return rows.map(normalizeContract);
}

export async function getCheltuieliLinii(): Promise<CheltuialaLinie[]> {
  const supabase = await createClient();
  const rows = await fetchAllRows<Record<string, unknown>>((from, to) =>
    supabase.from("cheltuieli_linii").select("*").order("luna", { ascending: false }).range(from, to)
  );
  return rows.map(normalizeLinie);
}

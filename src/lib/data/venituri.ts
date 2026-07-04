import { createClient } from "@/lib/supabase/server";
import type { Contract, VenitLinie } from "@/types/venituri";

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

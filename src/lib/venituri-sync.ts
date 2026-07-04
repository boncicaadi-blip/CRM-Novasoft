import { createClient } from "@/lib/supabase/server";
import { getTodayISO } from "@/lib/date";
import type { TipVenit } from "@/types/venituri";

function firstOfMonth(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

/** Toate lunile (prima zi a lunii, format YYYY-MM-DD) intre doua date, inclusiv. */
function monthsBetween(startStr: string, endStr: string): string[] {
  const start = new Date(`${firstOfMonth(startStr)}T00:00:00Z`);
  const end = new Date(`${firstOfMonth(endStr)}T00:00:00Z`);
  const months: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    months.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

/**
 * Genereaza liniile de venit lipsa pentru toate contractele active. Functie
 * "pura" - NU foloseste revalidatePath sau alt efect de cache, ca sa poata
 * fi apelata in siguranta si direct din randarea unei pagini (Server
 * Component), nu doar dintr-un Server Action declansat de un click.
 *
 * Server Actions din actions/venituri.ts (butonul de sincronizare, crearea
 * unui contract) apeleaza aceeasi functie, apoi fac ele insele
 * revalidatePath, dupa ce randarea s-a terminat.
 */
export async function runVenituriLiniiSync(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ generate: number }> {
  const { data: contracte } = await supabase.from("contracte").select("*").eq("status_contract", "Activ");

  const today = new Date(`${getTodayISO()}T00:00:00Z`);
  const bufferEnd = new Date(today);
  bufferEnd.setUTCMonth(bufferEnd.getUTCMonth() + 1);
  const bufferEndStr = bufferEnd.toISOString().slice(0, 10);

  let totalGenerate = 0;

  for (const contract of contracte ?? []) {
    const { data: existente } = await supabase
      .from("venituri_linii")
      .select("luna")
      .eq("contract_id", contract.id);
    const existenteSet = new Set((existente ?? []).map((r) => r.luna));

    // Nerecurent: o singura linie, pentru luna de inceput a contractului -
    // nu se repeta lunar. Recurent: daca are data_sfarsit cunoscuta (ex: un
    // contract pe 12 luni), generam TOT intervalul dintr-o data, chiar daca
    // e mult in viitor - asta e exact rostul de a introduce contractul din
    // start cu durata lui completa. Doar contractele fara data_sfarsit
    // (nedeterminate) se genereaza incremental, pe masura ce trece timpul,
    // limitate la buffer-ul de o luna in avans.
    const luni =
      contract.tip_venit === "Nerecurent"
        ? contract.data_inceput <= bufferEndStr
          ? [firstOfMonth(contract.data_inceput)]
          : []
        : monthsBetween(contract.data_inceput, contract.data_sfarsit ?? bufferEndStr);

    const deGenerat = luni.filter((l) => !existenteSet.has(l));
    if (deGenerat.length === 0) continue;

    const rows = deGenerat.map((luna) => ({
      contract_id: contract.id,
      partner_id: contract.partner_id,
      nume_client: contract.nume_client,
      tip_venit: contract.tip_venit as TipVenit,
      produs: contract.produs,
      serviciu: contract.serviciu,
      luna,
      venit_estimat: contract.valoare_lunara,
      venit_realizat: null,
      facturat: false,
    }));

    const { error: insertError } = await supabase.from("venituri_linii").insert(rows);
    if (!insertError) totalGenerate += rows.length;
  }

  return { generate: totalGenerate };
}

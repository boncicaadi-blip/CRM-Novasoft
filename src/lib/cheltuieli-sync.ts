import { createClient } from "@/lib/supabase/server";
import { getTodayISO } from "@/lib/date";
import type { ContractCheltuiala, FrecventaCheltuiala } from "@/types/cheltuieli";

function firstOfMonth(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

function monthDiff(fromStr: string, toStr: string): number {
  const from = new Date(`${fromStr}T00:00:00Z`);
  const to = new Date(`${toStr}T00:00:00Z`);
  return (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

interface LiniePlanificata {
  luna: string;
  valoare_prognozata: number;
}

/**
 * Calculeaza liniile "dorite" pentru un contract de cheltuiala - oglinda
 * computeContractLines de la Venituri.
 *
 * Recurenta: o linie pe luna, cu valoarea_lunara, de la data_inceput pana la
 * data_sfarsit (sau pana la buffer, daca e nedeterminat).
 * Nerecurenta: genereaza exact nr_rate linii, spatiate lunar, cu valoarea
 * impartita egal (1 rata = o singura plata integrala).
 */
export function computeCheltuialaContractLines(
  contract: Pick<ContractCheltuiala, "frecventa" | "data_inceput" | "data_sfarsit" | "valoare_lunara" | "nr_rate">,
  bufferEndStr: string
): LiniePlanificata[] {
  if (contract.frecventa === "Nerecurenta") {
    const nrRate = Math.max(1, contract.nr_rate ?? 1);
    const valoarePerRata = contract.valoare_lunara / nrRate;
    const linii: LiniePlanificata[] = [];
    for (let i = 0; i < nrRate; i++) {
      linii.push({ luna: addMonths(firstOfMonth(contract.data_inceput), i), valoare_prognozata: valoarePerRata });
    }
    return linii;
  }

  const start = firstOfMonth(contract.data_inceput);
  const effectiveEnd = contract.data_sfarsit ?? bufferEndStr;
  const end = firstOfMonth(effectiveEnd);
  const totalLuni = monthDiff(start, end) + 1;
  if (totalLuni <= 0) return [];

  const linii: LiniePlanificata[] = [];
  for (let i = 0; i < totalLuni; i++) {
    linii.push({ luna: addMonths(start, i), valoare_prognozata: contract.valoare_lunara });
  }
  return linii;
}

function bufferEnd(): string {
  const today = new Date(`${getTodayISO()}T00:00:00Z`);
  today.setUTCMonth(today.getUTCMonth() + 1);
  return today.toISOString().slice(0, 10);
}

/** Sincronizare aditiva pentru toate contractele active - oglinda
 * runVenituriLiniiSync. */
export async function runCheltuieliLiniiSync(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ generate: number }> {
  const { data: contracte } = await supabase
    .from("contracte_cheltuieli")
    .select("*")
    .eq("status_contract", "Activ");
  if (!contracte || contracte.length === 0) return { generate: 0 };

  const bufferEndStr = bufferEnd();
  const contractIds = contracte.map((c) => c.id);
  const { data: existente } = await supabase
    .from("cheltuieli_linii")
    .select("contract_id, luna")
    .in("contract_id", contractIds);

  const existenteByContract = new Map<string, Set<string>>();
  for (const row of existente ?? []) {
    if (!row.contract_id) continue;
    const set = existenteByContract.get(row.contract_id) ?? new Set<string>();
    set.add(row.luna);
    existenteByContract.set(row.contract_id, set);
  }

  const allRows: Record<string, unknown>[] = [];
  for (const contract of contracte) {
    const existenteSet = existenteByContract.get(contract.id) ?? new Set<string>();
    const planificate = computeCheltuialaContractLines(contract, bufferEndStr);
    const deGenerat = planificate.filter((p) => !existenteSet.has(p.luna));

    for (const p of deGenerat) {
      allRows.push({
        contract_id: contract.id,
        furnizor: contract.furnizor,
        incadrare: contract.incadrare,
        clasa: contract.clasa,
        detaliu: contract.detaliu,
        frecventa: contract.frecventa as FrecventaCheltuiala,
        luna: p.luna,
        valoare_prognozata: p.valoare_prognozata,
        valoare_realizata: null,
        platit: false,
      });
    }
  }

  if (allRows.length === 0) return { generate: 0 };

  let totalGenerate = 0;
  const batchSize = 500;
  for (let i = 0; i < allRows.length; i += batchSize) {
    const batch = allRows.slice(i, i + batchSize);
    const { error } = await supabase.from("cheltuieli_linii").insert(batch);
    if (!error) totalGenerate += batch.length;
  }

  return { generate: totalGenerate };
}

/** Regenereaza complet liniile unui contract - oglinda regenerateContractLines. */
export async function regenerateCheltuialaContractLines(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractId: string
): Promise<{ generate: number }> {
  const { data: contract } = await supabase
    .from("contracte_cheltuieli")
    .select("*")
    .eq("id", contractId)
    .single();
  if (!contract) return { generate: 0 };

  const { data: vechi } = await supabase
    .from("cheltuieli_linii")
    .select("luna, valoare_realizata, platit")
    .eq("contract_id", contractId);

  const bufferEndStr = bufferEnd();
  const planificate = computeCheltuialaContractLines(contract, bufferEndStr);

  const rows = planificate.map((p) => {
    const acoperite = (vechi ?? []).filter((v) => v.luna === p.luna);
    let valoareRealizata: number | null = null;
    if (acoperite.some((v) => v.valoare_realizata !== null)) {
      valoareRealizata = acoperite.reduce((sum, v) => sum + (v.valoare_realizata ?? 0), 0);
    }
    const platit = acoperite.length > 0 && acoperite.every((v) => v.platit);

    return {
      contract_id: contract.id,
      furnizor: contract.furnizor,
      incadrare: contract.incadrare,
      clasa: contract.clasa,
      detaliu: contract.detaliu,
      frecventa: contract.frecventa as FrecventaCheltuiala,
      luna: p.luna,
      valoare_prognozata: p.valoare_prognozata,
      valoare_realizata: valoareRealizata,
      platit,
    };
  });

  await supabase.from("cheltuieli_linii").delete().eq("contract_id", contractId);
  if (rows.length > 0) {
    await supabase.from("cheltuieli_linii").insert(rows);
  }

  return { generate: rows.length };
}

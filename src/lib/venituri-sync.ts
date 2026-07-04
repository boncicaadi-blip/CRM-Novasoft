import { createClient } from "@/lib/supabase/server";
import { getTodayISO } from "@/lib/date";
import type { Contract, TipVenit } from "@/types/venituri";

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

/** Cate luni acopera o linie, in functie de modalitatea de facturare. Rate
 * si Etape nu au o cadenta fixa - liniile lor se introduc manual. */
const MODALITATE_LUNI: Record<string, number> = {
  Lunar: 1,
  Trimestrial: 3,
  Semestrial: 6,
  Anual: 12,
};

interface LiniePlanificata {
  luna: string;
  luniInPerioada: number;
  venit_estimat: number;
}

/**
 * Calculeaza liniile "dorite" pentru un contract, in functie de tip_venit si
 * modalitate_facturare - functie pura, fara acces la baza de date.
 *
 * Recurent: o linie per perioada (Lunar=1 luna, Trimestrial=3, Semestrial=6,
 * Anual=12), cu valoare = valoare_lunara x numarul de luni din perioada. La
 * finalul unui contract cu durata care nu se imparte exact, ultima perioada
 * e mai scurta (proportional mai mica).
 *
 * Nerecurent: genereaza exact nr_rate linii, spatiate lunar incepand cu data
 * de inceput, cu valoarea impartita egal intre ele (1 rata = Integral, o
 * singura linie cu valoarea intreaga). Modalitate_facturare (Rate/Etape/
 * Integral) e doar informativa aici - fiecare linie generata se poate edita
 * ulterior individual (valoare + luna), pentru rate inegale sau date
 * specifice negociate cu clientul.
 */
export function computeContractLines(
  contract: Pick<
    Contract,
    "tip_venit" | "modalitate_facturare" | "data_inceput" | "data_sfarsit" | "valoare_lunara" | "nr_rate"
  >,
  bufferEndStr: string
): LiniePlanificata[] {
  if (contract.tip_venit === "Nerecurent") {
    const nrRate = Math.max(1, contract.nr_rate ?? 1);
    const valoarePerRata = contract.valoare_lunara / nrRate;
    const linii: LiniePlanificata[] = [];
    for (let i = 0; i < nrRate; i++) {
      linii.push({
        luna: addMonths(firstOfMonth(contract.data_inceput), i),
        luniInPerioada: 1,
        venit_estimat: valoarePerRata,
      });
    }
    return linii;
  }

  const luniPerioada = MODALITATE_LUNI[contract.modalitate_facturare ?? "Lunar"] ?? 1;
  const start = firstOfMonth(contract.data_inceput);
  // Daca data_sfarsit e cunoscuta (contract cu durata clara, ex. 12 luni),
  // generam TOT intervalul dintr-o data - nu doar pana la buffer. Doar
  // contractele fara data_sfarsit (nedeterminate) sunt limitate la buffer,
  // generandu-se incremental pe masura ce trece timpul.
  const effectiveEnd = contract.data_sfarsit ?? bufferEndStr;
  const end = firstOfMonth(effectiveEnd);

  const totalLuni = monthDiff(start, end) + 1;
  if (totalLuni <= 0) return [];

  const linii: LiniePlanificata[] = [];
  let acoperit = 0;
  let cursor = start;
  while (acoperit < totalLuni) {
    const ramase = totalLuni - acoperit;
    const span = Math.min(luniPerioada, ramase);
    linii.push({ luna: cursor, luniInPerioada: span, venit_estimat: contract.valoare_lunara * span });
    cursor = addMonths(cursor, span);
    acoperit += span;
  }
  return linii;
}

function bufferEnd(): string {
  const today = new Date(`${getTodayISO()}T00:00:00Z`);
  today.setUTCMonth(today.getUTCMonth() + 1);
  return today.toISOString().slice(0, 10);
}

/**
 * Sincronizare ADITIVA pentru toate contractele active - genereaza doar
 * liniile care lipsesc, fara sa atinga liniile deja existente (fie ele
 * generate anterior sau editate manual). Sigura de rulat oricand, inclusiv
 * la fiecare incarcare de pagina - nu e o resincronizare completa.
 */
export async function runVenituriLiniiSync(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ generate: number }> {
  const { data: contracte } = await supabase.from("contracte").select("*").eq("status_contract", "Activ");
  const bufferEndStr = bufferEnd();
  let totalGenerate = 0;

  for (const contract of contracte ?? []) {
    const { data: existente } = await supabase
      .from("venituri_linii")
      .select("luna")
      .eq("contract_id", contract.id);
    const existenteSet = new Set((existente ?? []).map((r) => r.luna));

    const planificate = computeContractLines(contract, bufferEndStr);
    const deGenerat = planificate.filter((p) => !existenteSet.has(p.luna));
    if (deGenerat.length === 0) continue;

    const rows = deGenerat.map((p) => ({
      contract_id: contract.id,
      partner_id: contract.partner_id,
      nume_client: contract.nume_client,
      tip_venit: contract.tip_venit as TipVenit,
      produs: contract.produs,
      serviciu: contract.serviciu,
      luna: p.luna,
      venit_estimat: p.venit_estimat,
      venit_realizat: null,
      facturat: false,
    }));

    const { error } = await supabase.from("venituri_linii").insert(rows);
    if (!error) totalGenerate += rows.length;
  }

  return { generate: totalGenerate };
}

/**
 * Regenereaza COMPLET liniile unui singur contract, dupa ce a fost editat -
 * sterge liniile vechi si le recreeaza dupa noile setari (tip venit, data
 * inceput/sfarsit, valoare, modalitate facturare), dar PASTREAZA ce era deja
 * marcat ca realizat/facturat, pe cat posibil (prin suprapunerea de perioade
 * intre liniile vechi si cele noi) - nu se pierde niciodata o incasare deja
 * inregistrata doar pentru ca ai schimbat, de exemplu, modalitatea de
 * facturare din Lunar in Semestrial.
 */
export async function regenerateContractLines(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contractId: string
): Promise<{ generate: number }> {
  const { data: contract } = await supabase.from("contracte").select("*").eq("id", contractId).single();
  if (!contract) return { generate: 0 };

  const { data: vechi } = await supabase
    .from("venituri_linii")
    .select("luna, venit_realizat, facturat")
    .eq("contract_id", contractId);

  const bufferEndStr = bufferEnd();
  const planificate = computeContractLines(contract, bufferEndStr);

  const rows = planificate.map((p) => {
    const perioadaEnd = addMonths(p.luna, p.luniInPerioada);
    const acoperite = (vechi ?? []).filter((v) => v.luna >= p.luna && v.luna < perioadaEnd);

    let venitRealizat: number | null = null;
    if (acoperite.some((v) => v.venit_realizat !== null)) {
      venitRealizat = acoperite.reduce((sum, v) => sum + (v.venit_realizat ?? 0), 0);
    }
    const facturat = acoperite.length > 0 && acoperite.every((v) => v.facturat);

    return {
      contract_id: contract.id,
      partner_id: contract.partner_id,
      nume_client: contract.nume_client,
      tip_venit: contract.tip_venit as TipVenit,
      produs: contract.produs,
      serviciu: contract.serviciu,
      luna: p.luna,
      venit_estimat: p.venit_estimat,
      venit_realizat: venitRealizat,
      facturat,
    };
  });

  await supabase.from("venituri_linii").delete().eq("contract_id", contractId);
  if (rows.length > 0) {
    await supabase.from("venituri_linii").insert(rows);
  }

  return { generate: rows.length };
}

"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { getTodayISO } from "@/lib/date";
import { normalizeName } from "@/lib/normalizeName";
import { syncPartnersAction } from "@/lib/actions/partners";
import type { ComportamentPlata, TipVanzare } from "@/types/creante";

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function toIntString(v: unknown): string | null {
  const n = toNumber(v);
  return n === null ? null : String(Math.trunc(n));
}

function toDateStr(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && v.trim() !== "") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

async function requireAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { supabase, userId: null, isAdmin: false };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .single();

  return { supabase, userId: userData.user.id, isAdmin: profile?.role === "admin" };
}

// ----------------------------------------------------------------------------
// Import: doua formate suportate, detectate automat dupa antetul coloanelor.
//
// 1. FORMAT BRUT - exportul lunar din aplicatia de facturare (fara Sold,
//    fara Tip Vanzare, fara incasari - doar facturile emise). Acesta va fi
//    formatul folosit la fiecare import viitor.
// 2. FORMAT UNIFICAT - folosit o singura data, pentru backfill-ul istoric
//    (2025 - prezent), contine deja Sold Actual / Data incasare / Tip
//    Vanzare / Comportament de plata, calculate manual in Excel.
// ----------------------------------------------------------------------------

interface RawRowBrut {
  "Nr. factura"?: unknown;
  Client?: unknown;
  "Data Factura"?: unknown;
  "Total Fara TVAEUR"?: unknown;
  "Termen Incasare"?: unknown;
  Scadenta?: unknown;
  "Nr Contract"?: unknown;
  "Data Contract"?: unknown;
  "Total Val Fact"?: unknown;
  "Total Val TVA Fact"?: unknown;
  "Total Fact"?: unknown;
  "Rest Incasare Fact"?: unknown;
  Produs?: unknown;
  "Serviciu Facturare"?: unknown;
}

interface RawRowUnificat {
  "Nume firma"?: unknown;
  "Serviciu facturat"?: unknown;
  "Tip Vanzare"?: unknown;
  "Nr factura"?: unknown;
  "Data factura"?: unknown;
  "Data scadenta"?: unknown;
  "Total factura"?: unknown;
  "Sold Actual"?: unknown;
  "Data incasare"?: unknown;
  "Comportament de plata"?: unknown;
  Observatii?: unknown;
  "Grad dificultate incasare"?: unknown;
  "Propus spre incasare"?: unknown;
}

const COMPORTAMENT_VALUES: ComportamentPlata[] = ["Bun platnic", "Platnic mediu", "Rau platnic"];
const TIP_VANZARE_VALUES: TipVanzare[] = ["Recurente", "Nerecurente"];

export async function importCreanteAction(
  formData: FormData
): Promise<{
  success: boolean;
  message?: string;
  data?: { noi: number; actualizate: number; duplicateSarite: string[] };
}> {
  const { supabase, userId, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot importa creante." };

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, message: "Niciun fisier incarcat." };
  }

  let rows: Record<string, unknown>[];
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const preferredSheet = workbook.SheetNames.find(
      (n) => n.trim().toLowerCase() === "creante_unificat"
    );
    const sheet = workbook.Sheets[preferredSheet ?? workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  } catch (err) {
    console.error("importCreanteAction parse error:", err);
    return { success: false, message: "Fisierul nu a putut fi citit. Verifica formatul." };
  }

  if (rows.length === 0) {
    return { success: false, message: "Fisierul nu contine randuri de date." };
  }

  const isUnificat = "Nume firma" in rows[0];

  const [{ data: existingRows }, { data: opportunities }] = await Promise.all([
    supabase.from("creante").select("id, nr_factura"),
    supabase.from("opportunities").select("id, nume_potential, nume_grup"),
  ]);

  const existingByNrFactura = new Map((existingRows ?? []).map((r) => [r.nr_factura, r.id]));
  const opportunityByName = new Map<string, string>();
  for (const o of opportunities ?? []) {
    opportunityByName.set(normalizeName(o.nume_potential), o.id);
    if (o.nume_grup) opportunityByName.set(normalizeName(o.nume_grup), o.id);
  }

  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: { nrFactura: string; payload: Record<string, unknown> }[] = [];
  const duplicateInFile = new Map<string, number>();
  const seedIncasari: { nrFactura: string; valoare: number; data: string; observatie: string }[] =
    [];

  const rowsByNrFactura = new Map<string, Record<string, unknown>>();
  const nrFacturaField = isUnificat ? "Nr factura" : "Nr. factura";
  for (const row of rows) {
    const nrFactura = toIntString(row[nrFacturaField]);
    if (!nrFactura) continue;
    if (rowsByNrFactura.has(nrFactura)) {
      duplicateInFile.set(nrFactura, (duplicateInFile.get(nrFactura) ?? 1) + 1);
    }
    rowsByNrFactura.set(nrFactura, row);
  }

  for (const [nrFactura, row] of rowsByNrFactura) {
    const existingId = existingByNrFactura.get(nrFactura);

    if (isUnificat) {
      const r = row as RawRowUnificat;
      const numeFirma = typeof r["Nume firma"] === "string" ? r["Nume firma"].trim() : null;
      if (!numeFirma) continue;

      const totalFactura = toNumber(r["Total factura"]) ?? 0;
      const soldActualRaw = toNumber(r["Sold Actual"]) ?? totalFactura;
      // Clamp defensiv: indiferent ce contine sursa, soldul nu poate fi
      // negativ si nu poate depasi totalul facturii - altfel valoarea
      // incasata calculata (total - sold) poate iesi absurda (ex: dubla
      // fata de total, daca sursa are conventie de semn diferita).
      const soldActual = Math.min(Math.max(soldActualRaw, 0), totalFactura);
      const valoareIncasataEfectiva = Math.max(0, totalFactura - soldActual);
      const opportunityId = opportunityByName.get(normalizeName(numeFirma)) ?? null;

      const comportamentRaw =
        typeof r["Comportament de plata"] === "string" ? r["Comportament de plata"] : null;
      const comportament = COMPORTAMENT_VALUES.includes(comportamentRaw as ComportamentPlata)
        ? (comportamentRaw as ComportamentPlata)
        : null;

      const tipVanzareRaw = typeof r["Tip Vanzare"] === "string" ? r["Tip Vanzare"] : null;
      const tipVanzare = TIP_VANZARE_VALUES.includes(tipVanzareRaw as TipVanzare)
        ? (tipVanzareRaw as TipVanzare)
        : null;

      const rawFields: Record<string, unknown> = {
        nume_firma: numeFirma,
        opportunity_id: opportunityId,
        data_factura: toDateStr(r["Data factura"]),
        data_scadenta: toDateStr(r["Data scadenta"]),
        serviciu_facturat: typeof r["Serviciu facturat"] === "string" ? r["Serviciu facturat"] : null,
        tip_vanzare: tipVanzare,
        total_factura: totalFactura,
        comportament_plata: comportament,
        observatii: typeof r.Observatii === "string" ? r.Observatii : null,
        propus_spre_incasare: Boolean(toNumber(r["Propus spre incasare"])),
      };

      if (existingId) {
        toUpdate.push({ nrFactura, payload: rawFields });
      } else {
        toInsert.push({ nr_factura: nrFactura, ...rawFields });
        if (valoareIncasataEfectiva > 0) {
          seedIncasari.push({
            nrFactura,
            valoare: valoareIncasataEfectiva,
            data:
              toDateStr(r["Data incasare"]) ??
              toDateStr(r["Data factura"]) ??
              getTodayISO(),
            observatie: "Incasare istorica (import backfill)",
          });
        }
      }
    } else {
      const r = row as RawRowBrut;
      const numeFirma = typeof r.Client === "string" ? r.Client.trim() : null;
      if (!numeFirma) continue;

      const totalFactura = toNumber(r["Total Fact"]) ?? 0;
      const restIncasareRaw = toNumber(r["Rest Incasare Fact"]);
      // Default sigur: daca lipseste coloana, presupunem NEIN CASAT (nu
      // incasat integral) - o subestimare e mult mai sigura decat o
      // supraestimare a banilor deja incasati. Clamp intre 0 si total,
      // ca sa nu putem obtine niciodata un sold negativ, indiferent de
      // conventia de semn din sursa (s-a vazut real cu facturi vechi).
      const restIncasare = Math.min(
        Math.max(restIncasareRaw ?? totalFactura, 0),
        totalFactura
      );
      const opportunityId = opportunityByName.get(normalizeName(numeFirma)) ?? null;

      const rawFields: Record<string, unknown> = {
        nume_firma: numeFirma,
        opportunity_id: opportunityId,
        data_factura: toDateStr(r["Data Factura"]),
        data_scadenta: toDateStr(r["Scadenta"]),
        nr_contract: toIntString(r["Nr Contract"]),
        data_contract: toDateStr(r["Data Contract"]),
        produs: typeof r.Produs === "string" ? r.Produs : null,
        serviciu_facturat:
          typeof r["Serviciu Facturare"] === "string" ? r["Serviciu Facturare"] : null,
        termen_incasare_zile: toNumber(r["Termen Incasare"]),
        valoare_lunara_fara_tva: toNumber(r["Total Fara TVAEUR"]),
        total_fara_tva: toNumber(r["Total Val Fact"]),
        total_tva: toNumber(r["Total Val TVA Fact"]),
        total_factura: totalFactura,
      };

      if (existingId) {
        toUpdate.push({ nrFactura, payload: rawFields });
      } else {
        toInsert.push({ nr_factura: nrFactura, ...rawFields });
        const seed = Math.max(0, totalFactura - restIncasare);
        if (seed > 0) {
          seedIncasari.push({
            nrFactura,
            valoare: seed,
            // Formatul brut nu are o data reala de incasare - nu o mai
            // aproximam cu data facturii (inducea in eroare, parea ca
            // s-a incasat exact in ziua emiterii). Folosim data importului
            // si spunem clar in observatie ca e o valoare mostenita, fara
            // data exacta cunoscuta.
            data: getTodayISO(),
            observatie: "Incasare istorica mostenita din export (data exacta necunoscuta)",
          });
        }
      }
    }
  }

  if (toInsert.length > 0) {
    const { data: inserted, error } = await supabase
      .from("creante")
      .insert(toInsert)
      .select("id, nr_factura");
    if (error) return { success: false, message: `Eroare la inserare: ${error.message}` };

    const idByNrFactura = new Map((inserted ?? []).map((r) => [r.nr_factura, r.id]));
    const seedRows = seedIncasari
      .map((s) => ({
        creanta_id: idByNrFactura.get(s.nrFactura),
        valoare: s.valoare,
        data_incasare: s.data,
        observatie: s.observatie,
      }))
      .filter((r) => r.creanta_id);

    if (seedRows.length > 0) {
      const { error: seedError } = await supabase.from("creante_incasari").insert(seedRows);
      if (seedError) console.error("Eroare la seed incasari:", seedError.message);
    }
  }

  if (toUpdate.length > 0) {
    const results = await Promise.all(
      toUpdate.map(({ nrFactura, payload }) =>
        supabase.from("creante").update(payload).eq("nr_factura", nrFactura)
      )
    );
    const firstError = results.find((r) => r.error);
    if (firstError?.error) {
      return { success: false, message: `Eroare la actualizare: ${firstError.error.message}` };
    }
  }

  await supabase.from("creante_import_batches").insert({
    fisier_nume: file.name,
    nr_facturi_noi: toInsert.length,
    nr_facturi_actualizate: toUpdate.length,
    importat_de: userId,
  });

  // Facturile noi pot aduce firme noi - sincronizam partenerii ca fisele de
  // client sa arate corect legaturile de la primul import, nu doar dupa o
  // sincronizare manuala ulterioara.
  if (toInsert.length > 0) {
    await syncPartnersAction();
  }

  revalidatePath("/creante");
  return {
    success: true,
    data: {
      noi: toInsert.length,
      actualizate: toUpdate.length,
      duplicateSarite: Array.from(duplicateInFile.keys()),
    },
  };
}

/**
 * Recalculeaza targetul lunii curente ca suma valorilor propuse (facturi
 * bifate "Propus spre incasare", cu sold > 0) si il salveaza in
 * creante_targets_lunare - targetul nu se mai seteaza manual, se calculeaza
 * automat pe masura ce bifezi/editezi facturile propuse. Lunile trecute nu
 * mai sunt atinse de aceasta functie (doar luna curenta), deci raman
 * "inghetate" la ultima valoare calculata cand acea luna era curenta.
 */
async function syncCurrentMonthTarget(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<void> {
  const { data: propuse } = await supabase
    .from("creante")
    .select("sold, valoare_propusa_spre_incasare")
    .eq("propus_spre_incasare", true)
    .gt("sold", 0);

  const target = (propuse ?? []).reduce(
    (sum, c) => sum + (c.valoare_propusa_spre_incasare ?? c.sold),
    0
  );
  const luna = getTodayISO().slice(0, 7);

  await supabase.from("creante_targets_lunare").upsert({ luna, target }, { onConflict: "luna" });
}

export async function updateCreantaTrackingAction(
  id: string,
  fields: {
    tip_vanzare?: TipVanzare | null;
    serviciu_facturat?: string | null;
    observatii?: string | null;
    valoare_propusa_spre_incasare?: number | null;
  }
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot edita creante." };

  if (fields.valoare_propusa_spre_incasare !== undefined && fields.valoare_propusa_spre_incasare !== null) {
    const { data: creanta } = await supabase.from("creante").select("sold").eq("id", id).single();
    if (creanta && fields.valoare_propusa_spre_incasare > creanta.sold) {
      return {
        success: false,
        message: `Valoarea propusa nu poate depasi soldul facturii (${creanta.sold} lei).`,
      };
    }
    if (fields.valoare_propusa_spre_incasare <= 0) {
      return { success: false, message: "Valoarea propusa trebuie sa fie pozitiva." };
    }
  }

  const { error } = await supabase.from("creante").update(fields).eq("id", id);
  if (error) return { success: false, message: error.message };

  if (fields.valoare_propusa_spre_incasare !== undefined) {
    await syncCurrentMonthTarget(supabase);
  }

  revalidatePath("/creante");
  revalidatePath("/creante/dashboard");
  return { success: true };
}

/** Bifa rapida "Propus spre incasare", direct din lista, fara sa deschizi modalul.
 * La bifare, valoarea propusa se initializeaza cu soldul integral - se poate
 * edita apoi in jos, din fisa facturii. La debifare, se goleste. Targetul
 * lunii curente se recalculeaza automat la fiecare bifare/debifare. */
export async function toggleProposSpreIncasareAction(
  id: string,
  value: boolean
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot edita creante." };

  let valoarePropusa: number | null = null;
  if (value) {
    const { data: creanta } = await supabase.from("creante").select("sold").eq("id", id).single();
    valoarePropusa = creanta?.sold ?? null;
  }

  const { error } = await supabase
    .from("creante")
    .update({ propus_spre_incasare: value, valoare_propusa_spre_incasare: valoarePropusa })
    .eq("id", id);
  if (error) return { success: false, message: error.message };

  await syncCurrentMonthTarget(supabase);

  revalidatePath("/creante");
  revalidatePath("/creante/dashboard");
  return { success: true };
}

export async function marcheazaIncasatAction(
  id: string,
  params: { valoare: number; dataIncasare: string; observatie?: string }
): Promise<{ success: boolean; message?: string }> {
  const { supabase, userId, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot marca incasari." };

  if (params.valoare <= 0) {
    return { success: false, message: "Valoarea incasata trebuie sa fie pozitiva." };
  }

  const { error } = await supabase.from("creante_incasari").insert({
    creanta_id: id,
    valoare: params.valoare,
    data_incasare: params.dataIncasare,
    observatie: params.observatie || null,
    creat_de: userId,
  });

  if (error) return { success: false, message: error.message };

  revalidatePath("/creante");
  return { success: true };
}

export async function undoIncasareAction(
  incasareId: string
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot anula incasari." };

  const { error } = await supabase.from("creante_incasari").delete().eq("id", incasareId);
  if (error) return { success: false, message: error.message };

  revalidatePath("/creante");
  return { success: true };
}

/** Sterge in masa facturi din Creante - pentru corectarea unor importuri gresite. */
export async function deleteCreanteAction(
  ids: string[]
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot sterge creante." };
  if (ids.length === 0) return { success: false, message: "Nicio factura selectata." };

  const { error } = await supabase.from("creante").delete().in("id", ids);
  if (error) return { success: false, message: error.message };

  revalidatePath("/creante");
  return { success: true };
}

/** Sterge TOATE creantele - pentru re-import curat dupa o corectie majora. */
export async function deleteAllCreanteAction(): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot sterge creante." };

  const { error } = await supabase
    .from("creante")
    .delete()
    .not("id", "is", null);
  if (error) return { success: false, message: error.message };

  revalidatePath("/creante");
  return { success: true };
}

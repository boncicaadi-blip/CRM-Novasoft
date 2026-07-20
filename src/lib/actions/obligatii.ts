"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import { getTodayISO } from "@/lib/date";
import { syncPartnersAction } from "@/lib/actions/partners";
import type { TipAchizitie } from "@/types/obligatii";

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
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

/** Nr factura la furnizori poate fi alfanumeric (ex: "AHR490003960") - spre
 * deosebire de facturile Novasoft emise, nu se converteste la intreg. */
function toInvoiceNr(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
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

interface RawRowUnificat {
  "Nume firma"?: unknown;
  "Serviciu facturat"?: unknown;
  "Tip Achizitie"?: unknown;
  "Nr factura"?: unknown;
  "Data factura"?: unknown;
  "Data scadenta"?: unknown;
  "Total factura"?: unknown;
  "Sold Actual"?: unknown;
  "Data platii"?: unknown;
  "Modalitate plata"?: unknown;
  "Responsabil achizitie"?: unknown;
  Observatii?: unknown;
  "Propus spre plata"?: unknown;
}

const TIP_ACHIZITIE_VALUES: TipAchizitie[] = ["Recurente", "Nerecurente"];

export async function importObligatiiAction(
  formData: FormData
): Promise<{
  success: boolean;
  message?: string;
  data?: { noi: number; actualizate: number; duplicateSarite: string[] };
}> {
  const { supabase, userId, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot importa obligatii." };

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, message: "Niciun fisier incarcat." };
  }

  let rows: Record<string, unknown>[];
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const preferredSheet = workbook.SheetNames.find(
      (n) => n.trim().toLowerCase() === "obligatii_unificat"
    );
    const sheet = workbook.Sheets[preferredSheet ?? workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  } catch (err) {
    console.error("importObligatiiAction parse error:", err);
    return { success: false, message: "Fisierul nu a putut fi citit. Verifica formatul." };
  }

  if (rows.length === 0) {
    return { success: false, message: "Fisierul nu contine randuri de date." };
  }

  // Momentan suportam doar formatul unificat (folosit la backfill-ul
  // istoric). Formatul de import recurent (din sursa de achizitii/
  // contabilitate) se adauga dupa ce e confirmata structura lui exacta.
  if (!("Nume firma" in rows[0]) || !("Tip Achizitie" in rows[0])) {
    return {
      success: false,
      message:
        "Format nerecunoscut. Momentan e suportat doar formatul unificat de backfill (sheet Obligatii_Unificat).",
    };
  }

  // Paginat explicit - vezi explicatia din actions/creante.ts (acelasi bug
  // real, gasit acolo: fara paginare, Supabase limiteaza implicit la 1000
  // de randuri).
  async function fetchAllObligatiiIds(): Promise<{ id: string; nr_factura: string }[]> {
    const pageSize = 1000;
    let all: { id: string; nr_factura: string }[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("obligatii")
        .select("id, nr_factura")
        .range(from, from + pageSize - 1);
      if (error) {
        console.error("fetchAllObligatiiIds error:", error.message);
        break;
      }
      if (!data || data.length === 0) break;
      all = all.concat(data);
      if (data.length < pageSize) break;
      from += pageSize;
    }
    return all;
  }

  const existingRows = await fetchAllObligatiiIds();

  const existingByNrFactura = new Map((existingRows ?? []).map((r) => [r.nr_factura, r.id]));

  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: { nrFactura: string; payload: Record<string, unknown> }[] = [];
  const duplicateInFile = new Map<string, number>();
  const seedPlati: { nrFactura: string; valoare: number; data: string; observatie: string }[] =
    [];

  const rowsByNrFactura = new Map<string, RawRowUnificat>();
  for (const row of rows as RawRowUnificat[]) {
    const nrFactura = toInvoiceNr(row["Nr factura"]);
    if (!nrFactura) continue;
    if (rowsByNrFactura.has(nrFactura)) {
      duplicateInFile.set(nrFactura, (duplicateInFile.get(nrFactura) ?? 1) + 1);
    }
    rowsByNrFactura.set(nrFactura, row);
  }

  for (const [nrFactura, r] of rowsByNrFactura) {
    const numeFurnizor = typeof r["Nume firma"] === "string" ? r["Nume firma"].trim() : null;
    if (!numeFurnizor) continue;

    const totalFactura = toNumber(r["Total factura"]) ?? 0;
    const soldActualRaw = toNumber(r["Sold Actual"]) ?? totalFactura;
    const soldActual = Math.min(Math.max(soldActualRaw, 0), totalFactura);
    const valoarePlatitaEfectiva = Math.max(0, totalFactura - soldActual);

    const tipRaw = typeof r["Tip Achizitie"] === "string" ? r["Tip Achizitie"] : null;
    const tipAchizitie = TIP_ACHIZITIE_VALUES.includes(tipRaw as TipAchizitie)
      ? (tipRaw as TipAchizitie)
      : null;

    const rawFields: Record<string, unknown> = {
      nume_furnizor: numeFurnizor,
      data_factura: toDateStr(r["Data factura"]),
      data_scadenta: toDateStr(r["Data scadenta"]),
      serviciu_facturat: typeof r["Serviciu facturat"] === "string" ? r["Serviciu facturat"] : null,
      tip_achizitie: tipAchizitie,
      modalitate_plata: typeof r["Modalitate plata"] === "string" ? r["Modalitate plata"] : null,
      responsabil_achizitie:
        typeof r["Responsabil achizitie"] === "string" ? r["Responsabil achizitie"] : null,
      total_factura: totalFactura,
      observatii: typeof r.Observatii === "string" ? r.Observatii : null,
      propus_spre_plata: Boolean(toNumber(r["Propus spre plata"])),
    };

    const existingId = existingByNrFactura.get(nrFactura);
    if (existingId) {
      toUpdate.push({ nrFactura, payload: rawFields });
    } else {
      toInsert.push({ nr_factura: nrFactura, ...rawFields });
      if (valoarePlatitaEfectiva > 0) {
        seedPlati.push({
          nrFactura,
          valoare: valoarePlatitaEfectiva,
          data: toDateStr(r["Data platii"]) ?? getTodayISO(),
          observatie: "Plata istorica (import backfill)",
        });
      }
    }
  }

  if (toInsert.length > 0) {
    const { data: inserted, error } = await supabase
      .from("obligatii")
      .insert(toInsert)
      .select("id, nr_factura");
    if (error) return { success: false, message: `Eroare la inserare: ${error.message}` };

    const idByNrFactura = new Map((inserted ?? []).map((r) => [r.nr_factura, r.id]));
    const seedRows = seedPlati
      .map((s) => ({
        obligatie_id: idByNrFactura.get(s.nrFactura),
        valoare: s.valoare,
        data_plata: s.data,
        observatie: s.observatie,
      }))
      .filter((r) => r.obligatie_id);

    if (seedRows.length > 0) {
      const { error: seedError } = await supabase.from("obligatii_plati").insert(seedRows);
      if (seedError) console.error("Eroare la seed plati:", seedError.message);
    }
  }

  if (toUpdate.length > 0) {
    const results = await Promise.all(
      toUpdate.map(({ nrFactura, payload }) =>
        supabase.from("obligatii").update(payload).eq("nr_factura", nrFactura)
      )
    );
    const firstError = results.find((r) => r.error);
    if (firstError?.error) {
      return { success: false, message: `Eroare la actualizare: ${firstError.error.message}` };
    }
  }

  await supabase.from("obligatii_import_batches").insert({
    fisier_nume: file.name,
    nr_facturi_noi: toInsert.length,
    nr_facturi_actualizate: toUpdate.length,
    importat_de: userId,
  });

  if (toInsert.length > 0) {
    await syncPartnersAction();
  }

  revalidatePath("/obligatii");
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
 * Recalculeaza targetul lunii curente ca suma valorilor propuse spre plata -
 * oglinda syncCurrentMonthTarget de la Creante.
 */
async function syncCurrentMonthTarget(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<void> {
  const { data: propuse } = await supabase
    .from("obligatii")
    .select("sold, valoare_propusa_spre_plata")
    .eq("propus_spre_plata", true)
    .gt("sold", 0);

  const target = (propuse ?? []).reduce(
    (sum, o) => sum + (o.valoare_propusa_spre_plata ?? o.sold),
    0
  );
  const luna = getTodayISO().slice(0, 7);

  await supabase.from("obligatii_targets_lunare").upsert({ luna, target }, { onConflict: "luna" });
}

export async function updateObligatieTrackingAction(
  id: string,
  fields: {
    tip_achizitie?: TipAchizitie | null;
    modalitate_plata?: string | null;
    serviciu_facturat?: string | null;
    observatii?: string | null;
    valoare_propusa_spre_plata?: number | null;
  }
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot edita obligatii." };

  if (fields.valoare_propusa_spre_plata !== undefined && fields.valoare_propusa_spre_plata !== null) {
    const { data: obligatie } = await supabase.from("obligatii").select("sold").eq("id", id).single();
    if (obligatie && fields.valoare_propusa_spre_plata > obligatie.sold) {
      return {
        success: false,
        message: `Valoarea propusa nu poate depasi soldul facturii (${obligatie.sold} lei).`,
      };
    }
    if (fields.valoare_propusa_spre_plata <= 0) {
      return { success: false, message: "Valoarea propusa trebuie sa fie pozitiva." };
    }
  }

  const { error } = await supabase.from("obligatii").update(fields).eq("id", id);
  if (error) return { success: false, message: error.message };

  if (fields.valoare_propusa_spre_plata !== undefined) {
    await syncCurrentMonthTarget(supabase);
  }

  revalidatePath("/obligatii");
  revalidatePath("/obligatii/dashboard");
  return { success: true };
}

/** Targetul lunii curente se recalculeaza automat la fiecare bifare/debifare. */
export async function toggleProposSprePlataAction(
  id: string,
  value: boolean
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot edita obligatii." };

  let valoarePropusa: number | null = null;
  if (value) {
    const { data: obligatie } = await supabase.from("obligatii").select("sold").eq("id", id).single();
    valoarePropusa = obligatie?.sold ?? null;
  }

  const { error } = await supabase
    .from("obligatii")
    .update({ propus_spre_plata: value, valoare_propusa_spre_plata: valoarePropusa })
    .eq("id", id);
  if (error) return { success: false, message: error.message };

  await syncCurrentMonthTarget(supabase);

  revalidatePath("/obligatii");
  revalidatePath("/obligatii/dashboard");
  return { success: true };
}

export async function marcheazaPlatitAction(
  id: string,
  params: { valoare: number; dataPlata: string; observatie?: string }
): Promise<{ success: boolean; message?: string }> {
  const { supabase, userId, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot marca plati." };

  if (params.valoare <= 0) {
    return { success: false, message: "Valoarea platita trebuie sa fie pozitiva." };
  }

  const { error } = await supabase.from("obligatii_plati").insert({
    obligatie_id: id,
    valoare: params.valoare,
    data_plata: params.dataPlata,
    observatie: params.observatie || null,
    creat_de: userId,
  });

  if (error) return { success: false, message: error.message };

  revalidatePath("/obligatii");
  return { success: true };
}

/**
 * Plata in bloc - pentru cazul in care se platesc mai multe facturi
 * simultan (acelasi furnizor sau furnizori diferiti). Fiecare factura
 * selectata se plateste INTEGRAL (sold-ul ei curent, citit proaspat din
 * baza de date). Daca o factura trebuie platita doar partial, se lasa
 * nebifata aici si se trateaza individual, din fisa facturii.
 */
/**
 * Seteaza Tip achizitie (Recurente/Nerecurente) in bloc, pe toate facturile
 * selectate - util cand imporți multe facturi deodata (ex. din E-Factura)
 * si vrei sa le clasifici rapid, fara sa intri pe fiecare individual.
 */
export async function setTipAchizitieBulkAction(
  ids: string[],
  tipAchizitie: TipAchizitie
): Promise<{ success: boolean; message?: string; nrProcesate?: number }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot edita obligatii." };
  if (ids.length === 0) return { success: false, message: "Nicio factura selectata." };

  const { error } = await supabase.from("obligatii").update({ tip_achizitie: tipAchizitie }).in("id", ids);
  if (error) return { success: false, message: error.message };

  revalidatePath("/obligatii");
  return { success: true, nrProcesate: ids.length };
}

export async function marcheazaPlatiteBulkAction(
  ids: string[],
  dataPlata: string
): Promise<{ success: boolean; message?: string; nrProcesate?: number }> {
  const { supabase, userId, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot marca plati." };
  if (ids.length === 0) return { success: false, message: "Nicio factura selectata." };

  const { data: obligatii, error: fetchError } = await supabase
    .from("obligatii")
    .select("id, sold")
    .in("id", ids);

  if (fetchError) return { success: false, message: fetchError.message };

  const dePlatit = (obligatii ?? []).filter((o) => Number(o.sold) > 0);
  if (dePlatit.length === 0) {
    return { success: false, message: "Facturile selectate sunt deja platite integral." };
  }

  const rows = dePlatit.map((o) => ({
    obligatie_id: o.id,
    valoare: Number(o.sold),
    data_plata: dataPlata,
    observatie: "Plata in bloc (selectie multipla)",
    creat_de: userId,
  }));

  const { error: insertError } = await supabase.from("obligatii_plati").insert(rows);
  if (insertError) return { success: false, message: insertError.message };

  revalidatePath("/obligatii");
  return { success: true, nrProcesate: rows.length };
}

export async function undoPlataAction(
  plataId: string
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot anula plati." };

  const { error } = await supabase.from("obligatii_plati").delete().eq("id", plataId);
  if (error) return { success: false, message: error.message };

  revalidatePath("/obligatii");
  return { success: true };
}

/**
 * Anuleaza in bloc ULTIMA plata inregistrata pentru fiecare factura
 * selectata (nu tot istoricul acelei facturi) - vezi comentariul de la
 * anuleazaUltimeleIncasariBulkAction (Creante), aceeasi logica in oglinda.
 */
export async function anuleazaUltimelePlatiBulkAction(
  ids: string[]
): Promise<{ success: boolean; message?: string; nrProcesate?: number }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot anula plati." };
  if (ids.length === 0) return { success: false, message: "Nicio factura selectata." };

  const { data: plati, error: fetchError } = await supabase
    .from("obligatii_plati")
    .select("id, obligatie_id, creat_la")
    .in("obligatie_id", ids)
    .order("creat_la", { ascending: false });

  if (fetchError) return { success: false, message: fetchError.message };

  const ultimaPerObligatie = new Map<string, string>();
  for (const row of plati ?? []) {
    if (!ultimaPerObligatie.has(row.obligatie_id)) ultimaPerObligatie.set(row.obligatie_id, row.id);
  }

  const idsDeSters = [...ultimaPerObligatie.values()];
  if (idsDeSters.length === 0) {
    return { success: false, message: "Facturile selectate nu au nicio plata de anulat." };
  }

  const { error: deleteError } = await supabase.from("obligatii_plati").delete().in("id", idsDeSters);
  if (deleteError) return { success: false, message: deleteError.message };

  revalidatePath("/obligatii");
  return { success: true, nrProcesate: idsDeSters.length };
}

export async function deleteObligatiiAction(
  ids: string[]
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot sterge obligatii." };
  if (ids.length === 0) return { success: false, message: "Nicio factura selectata." };

  const { error } = await supabase.from("obligatii").delete().in("id", ids);
  if (error) return { success: false, message: error.message };

  revalidatePath("/obligatii");
  return { success: true };
}

/** Sterge TOATE obligatiile - pentru re-import curat dupa o corectie majora. */
export async function deleteAllObligatiiAction(): Promise<{
  success: boolean;
  message?: string;
}> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot sterge obligatii." };

  const { error } = await supabase
    .from("obligatii")
    .delete()
    .not("id", "is", null);
  if (error) return { success: false, message: error.message };

  revalidatePath("/obligatii");
  return { success: true };
}

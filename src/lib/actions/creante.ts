"use server";

import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/server";
import type { ComportamentPlata } from "@/types/creante";

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

function normalizeName(s: string): string {
  return s
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
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

interface RawRow {
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

export async function importCreanteAction(
  formData: FormData
): Promise<{ success: boolean; message?: string; data?: { noi: number; actualizate: number } }> {
  const { supabase, userId, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot importa creante." };

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, message: "Niciun fisier incarcat." };
  }

  let rows: RawRow[];
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: null });
  } catch (err) {
    console.error("importCreanteAction parse error:", err);
    return { success: false, message: "Fisierul nu a putut fi citit. Verifica formatul." };
  }

  if (rows.length === 0) {
    return { success: false, message: "Fisierul nu contine randuri de date." };
  }

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

  for (const row of rows) {
    const nrFactura = toIntString(row["Nr. factura"]);
    const numeFirma = typeof row.Client === "string" ? row.Client.trim() : null;
    if (!nrFactura || !numeFirma) continue;

    const totalFactura = toNumber(row["Total Fact"]) ?? 0;
    const restIncasare = toNumber(row["Rest Incasare Fact"]) ?? 0;
    const opportunityId = opportunityByName.get(normalizeName(numeFirma)) ?? null;

    const rawFields: Record<string, unknown> = {
      nume_firma: numeFirma,
      opportunity_id: opportunityId,
      data_factura: toDateStr(row["Data Factura"]),
      data_scadenta: toDateStr(row["Scadenta"]),
      nr_contract: toIntString(row["Nr Contract"]),
      data_contract: toDateStr(row["Data Contract"]),
      produs: typeof row.Produs === "string" ? row.Produs : null,
      serviciu_facturat: typeof row["Serviciu Facturare"] === "string" ? row["Serviciu Facturare"] : null,
      termen_incasare_zile: toNumber(row["Termen Incasare"]),
      valoare_lunara_fara_tva: toNumber(row["Total Fara TVAEUR"]),
      total_fara_tva: toNumber(row["Total Val Fact"]),
      total_tva: toNumber(row["Total Val TVA Fact"]),
      total_factura: totalFactura,
    };

    const existingId = existingByNrFactura.get(nrFactura);
    if (existingId) {
      // Factura deja urmarita in aplicatie - actualizam doar campurile brute,
      // niciodata valoare_incasata / comportament_plata / observatii etc.
      toUpdate.push({ nrFactura, payload: rawFields });
    } else {
      // Factura noua - initializam valoarea incasata din exportul curent
      // (ce a fost deja incasat pana la data exportului), de aici incolo
      // gestionarea se face exclusiv din aplicatie.
      toInsert.push({
        nr_factura: nrFactura,
        ...rawFields,
        valoare_incasata: Math.max(0, totalFactura - restIncasare),
      });
    }
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("creante").insert(toInsert);
    if (error) return { success: false, message: `Eroare la inserare: ${error.message}` };
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

  revalidatePath("/creante");
  return { success: true, data: { noi: toInsert.length, actualizate: toUpdate.length } };
}

export async function updateCreantaTrackingAction(
  id: string,
  fields: {
    comportament_plata?: ComportamentPlata | null;
    grad_dificultate_incasare?: string | null;
    data_tinta_incasare?: string | null;
    observatii?: string | null;
    datorie_operationala?: boolean;
    departament_datorie_operationala?: string | null;
    procent_penalitate_intarziere?: number | null;
  }
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot edita creante." };

  const { error } = await supabase.from("creante").update(fields).eq("id", id);
  if (error) return { success: false, message: error.message };

  revalidatePath("/creante");
  return { success: true };
}

export async function marcheazaIncasatAction(
  id: string,
  params: { valoare: number; dataIncasare: string }
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot marca incasari." };

  if (params.valoare <= 0) {
    return { success: false, message: "Valoarea incasata trebuie sa fie pozitiva." };
  }

  const { data: creanta, error: fetchError } = await supabase
    .from("creante")
    .select("valoare_incasata, total_factura")
    .eq("id", id)
    .single();

  if (fetchError || !creanta) {
    return { success: false, message: "Factura nu a putut fi gasita." };
  }

  const noualValoareIncasata = Math.min(
    creanta.total_factura,
    creanta.valoare_incasata + params.valoare
  );

  const { error } = await supabase
    .from("creante")
    .update({
      valoare_incasata: noualValoareIncasata,
      data_incasare: params.dataIncasare,
    })
    .eq("id", id);

  if (error) return { success: false, message: error.message };

  revalidatePath("/creante");
  return { success: true };
}

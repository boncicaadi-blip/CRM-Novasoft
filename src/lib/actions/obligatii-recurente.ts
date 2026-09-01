"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TipAchizitie } from "@/types/obligatii";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { supabase, userId: null, isAdmin: false };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  return { supabase, userId: userData.user.id, isAdmin: profile?.role === "admin" };
}

function slugForNrFactura(nume: string): string {
  return nume
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
}

export async function createObligatieRecurentaAction(fields: {
  tip: "non_factura" | "furnizor";
  nume: string;
  partner_id?: string | null;
  cif_furnizor?: string | null;
  valoare: number;
  ziua_lunii: number;
  data_inceput: string;
  data_sfarsit?: string | null;
  serviciu_facturat?: string | null;
  tip_achizitie?: TipAchizitie | null;
  modalitate_plata?: string | null;
}): Promise<{ success: boolean; message?: string; id?: string }> {
  const { supabase, userId, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot crea reguli recurente." };

  if (!fields.nume.trim()) return { success: false, message: "Numele este obligatoriu." };
  if (!Number.isFinite(fields.valoare) || fields.valoare <= 0) {
    return { success: false, message: "Valoarea trebuie sa fie pozitiva." };
  }
  if (fields.ziua_lunii < 1 || fields.ziua_lunii > 28) {
    return { success: false, message: "Ziua lunii trebuie sa fie intre 1 si 28 (ca sa existe in orice luna)." };
  }

  const { data, error } = await supabase
    .from("obligatii_recurente")
    .insert({
      tip: fields.tip,
      nume: fields.nume.trim(),
      partner_id: fields.partner_id || null,
      cif_furnizor: fields.cif_furnizor || null,
      valoare: fields.valoare,
      ziua_lunii: fields.ziua_lunii,
      data_inceput: fields.data_inceput,
      data_sfarsit: fields.data_sfarsit || null,
      serviciu_facturat: fields.serviciu_facturat || null,
      tip_achizitie: fields.tip_achizitie || null,
      modalitate_plata: fields.modalitate_plata || null,
      creat_de: userId,
    })
    .select("id")
    .single();

  if (error) return { success: false, message: error.message };

  revalidatePath("/obligatii");
  return { success: true, id: data.id };
}

export async function updateObligatieRecurentaAction(
  id: string,
  fields: { activ?: boolean; valoare?: number; data_sfarsit?: string | null }
): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot edita reguli recurente." };

  const { error } = await supabase.from("obligatii_recurente").update(fields).eq("id", id);
  if (error) return { success: false, message: error.message };

  revalidatePath("/obligatii");
  return { success: true };
}

export async function deleteObligatieRecurentaAction(id: string): Promise<{ success: boolean; message?: string }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot sterge reguli recurente." };

  const { error } = await supabase.from("obligatii_recurente").delete().eq("id", id);
  if (error) return { success: false, message: error.message };

  revalidatePath("/obligatii");
  return { success: true };
}

/**
 * Genereaza randurile lunare in Obligatii (marcate sursa='prognoza') pentru
 * o regula recurenta, de la ultima luna generata (sau data_inceput, daca
 * nimic generat inca) pana la data data - nu genereaza a doua oara aceeasi
 * luna daca ruleaza de mai multe ori.
 */
export async function genereazaObligatiiRecurenteAction(
  recurentaId: string,
  panaLaData: string
): Promise<{ success: boolean; message?: string; nrGenerate?: number }> {
  const { supabase, isAdmin } = await requireAdmin();
  if (!isAdmin) return { success: false, message: "Doar administratorii pot genera obligatii recurente." };

  const { data: recurenta, error: recurentaError } = await supabase
    .from("obligatii_recurente")
    .select("*, partners(nume)")
    .eq("id", recurentaId)
    .single();

  if (recurentaError || !recurenta) return { success: false, message: "Regula recurenta nu a fost gasita." };

  const { data: existente } = await supabase
    .from("obligatii")
    .select("data_scadenta")
    .eq("obligatie_recurenta_id", recurentaId);

  const luniExistente = new Set((existente ?? []).map((o) => o.data_scadenta?.slice(0, 7)).filter(Boolean));

  const dataStart = new Date(recurenta.data_inceput);
  const dataLimita = new Date(panaLaData);
  const dataSfarsit = recurenta.data_sfarsit ? new Date(recurenta.data_sfarsit) : null;
  const dataFinala = dataSfarsit && dataSfarsit < dataLimita ? dataSfarsit : dataLimita;

  const numeFurnizor = (recurenta.partners as unknown as { nume: string } | null)?.nume ?? recurenta.nume;
  // Includem si serviciul (diferentiaza vizual doua reguli cu acelasi nume,
  // ex. "NOVASOFT - Salarii" vs "NOVASOFT - TVA") si un fragment din id-ul
  // regulii (garanteaza unicitate, indiferent daca doua reguli ajung sa aiba
  // acelasi nume SI acelasi serviciu).
  const slugNume = slugForNrFactura(recurenta.nume);
  const slugServiciu = recurenta.serviciu_facturat ? slugForNrFactura(recurenta.serviciu_facturat) : "";
  const idScurt = recurentaId.replace(/-/g, "").slice(0, 6).toUpperCase();
  const slug = [slugNume, slugServiciu, idScurt].filter(Boolean).join("-");

  let nrGenerate = 0;
  const erori: string[] = [];
  const cursor = new Date(dataStart.getFullYear(), dataStart.getMonth(), 1);

  while (cursor <= dataFinala) {
    const lunaKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
    if (!luniExistente.has(lunaKey)) {
      const zi = Math.min(recurenta.ziua_lunii, new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate());
      const dataScadenta = `${lunaKey}-${String(zi).padStart(2, "0")}`;
      const nrFactura = `PROG-${slug}-${lunaKey}`;

      const { error: insertError } = await supabase.from("obligatii").insert({
        nr_factura: nrFactura,
        nume_furnizor: numeFurnizor,
        cif_furnizor: recurenta.cif_furnizor,
        partner_id: recurenta.partner_id,
        data_factura: dataScadenta,
        data_scadenta: dataScadenta,
        serviciu_facturat: recurenta.serviciu_facturat,
        tip_achizitie: recurenta.tip_achizitie,
        modalitate_plata: recurenta.modalitate_plata,
        total_factura: recurenta.valoare,
        sursa: "prognoza",
        obligatie_recurenta_id: recurentaId,
      });

      if (insertError) erori.push(`${lunaKey}: ${insertError.message}`);
      else nrGenerate += 1;
    }
    cursor.setMonth(cursor.getMonth() + 1);
  }

  revalidatePath("/obligatii");

  if (erori.length > 0) {
    return { success: nrGenerate > 0, message: `${nrGenerate} generate. Erori: ${erori.slice(0, 3).join("; ")}`, nrGenerate };
  }
  return { success: true, nrGenerate };
}

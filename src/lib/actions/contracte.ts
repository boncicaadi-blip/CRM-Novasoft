"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

async function requireAdminOrEditor() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { ok: false as const, message: "Trebuie sa fii autentificat." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { ok: false as const, message: "Doar administratorii si editorii pot gestiona draft-uri de contract." };
  }
  return { ok: true as const, supabase, userId: userData.user.id };
}

/**
 * Incarca un draft de contract nou (.docx cu placeholder-uri {{tag}}).
 * Daca exista deja un draft activ cu acelasi nume, il dezactiveaza automat
 * (nu il sterge - ramane in istoric) si creeaza o versiune noua.
 */
export async function uploadContractDraftAction(formData: FormData): Promise<{ success: boolean; message: string }> {
  const check = await requireAdminOrEditor();
  if (!check.ok) return { success: false, message: check.message };

  const file = formData.get("file");
  const nume = formData.get("nume");
  const tipContractId = formData.get("tip_contract_id");
  const produsServiciuId = formData.get("produs_serviciu_id");

  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: "Selecteaza un fisier .docx." };
  }
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return { success: false, message: "Doar fisiere .docx sunt acceptate." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { success: false, message: "Fisierul depaseste 15MB." };
  }
  if (typeof nume !== "string" || !nume.trim()) {
    return { success: false, message: "Numele draft-ului este obligatoriu." };
  }
  if (typeof tipContractId !== "string" || !tipContractId) {
    return { success: false, message: "Tipul de contract este obligatoriu." };
  }

  // Daca exista deja un draft activ cu acelasi nume, aflam versiunea lui ca
  // sa incrementam - si il dezactivam (istoric pastrat, nu sters).
  const { data: existent } = await check.supabase
    .from("contract_drafturi")
    .select("id, versiune")
    .eq("nume", nume.trim())
    .eq("activ", true)
    .maybeSingle();

  const nextVersion = (existent?.versiune ?? 0) + 1;
  const storagePath = `drafturi/${Date.now()}_${sanitizeFileName(file.name)}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await check.supabase.storage.from("contracte").upload(storagePath, arrayBuffer, {
    contentType: DOCX_MIME,
    upsert: false,
  });
  if (uploadError) return { success: false, message: uploadError.message };

  const { error: insertError } = await check.supabase.from("contract_drafturi").insert({
    nume: nume.trim(),
    tip_contract_id: tipContractId,
    produs_serviciu_id: typeof produsServiciuId === "string" && produsServiciuId ? produsServiciuId : null,
    storage_path: storagePath,
    versiune: nextVersion,
    activ: true,
    created_by: check.userId,
  });

  if (insertError) {
    await check.supabase.storage.from("contracte").remove([storagePath]);
    return { success: false, message: insertError.message };
  }

  if (existent) {
    await check.supabase.from("contract_drafturi").update({ activ: false }).eq("id", existent.id);
  }

  revalidatePath("/contracte/drafturi");
  return { success: true, message: `Draft incarcat (versiunea ${nextVersion}).` };
}

export async function toggleActivDraftAction(id: string, activ: boolean): Promise<{ success: boolean; message?: string }> {
  const check = await requireAdminOrEditor();
  if (!check.ok) return { success: false, message: check.message };

  const { error } = await check.supabase.from("contract_drafturi").update({ activ }).eq("id", id);
  if (error) return { success: false, message: error.message };

  revalidatePath("/contracte/drafturi");
  return { success: true };
}

export async function stergeDraftAction(id: string): Promise<{ success: boolean; message?: string }> {
  const check = await requireAdminOrEditor();
  if (!check.ok) return { success: false, message: check.message };

  const { data: draft } = await check.supabase.from("contract_drafturi").select("storage_path").eq("id", id).maybeSingle();

  const { error } = await check.supabase.from("contract_drafturi").delete().eq("id", id);
  if (error) return { success: false, message: error.message };

  if (draft?.storage_path) {
    await check.supabase.storage.from("contracte").remove([draft.storage_path]);
  }

  revalidatePath("/contracte/drafturi");
  return { success: true };
}

/**
 * Genereaza un contract de test - completeaza un draft cu datele unui
 * partener (fara Claude inca, doar substitutie directa a campurilor simple)
 * si il salveaza in bucket-ul "contracte", sub "generate/". Util ca sa
 * verificam mecanismul de baza inainte sa adaugam clauzele scrise de Claude.
 */
export async function genereazaContractTestAction(
  partnerId: string,
  draftId: string
): Promise<{ success: boolean; message: string; contractId?: string; downloadUrl?: string }> {
  const check = await requireAdminOrEditor();
  if (!check.ok) return { success: false, message: check.message };

  const { data: draft, error: draftError } = await check.supabase
    .from("contract_drafturi")
    .select("id, storage_path, nume")
    .eq("id", draftId)
    .maybeSingle();
  if (draftError || !draft) return { success: false, message: "Draft-ul nu a fost gasit." };

  const { data: partner, error: partnerError } = await check.supabase
    .from("partners")
    .select("nume, oras, adresa, reg_com, cod_fiscal, atribut_fiscal, reprezentant_nume, reprezentant_functie, forma_juridica")
    .eq("id", partnerId)
    .maybeSingle();
  if (partnerError || !partner) return { success: false, message: "Partenerul nu a fost gasit." };

  const { data: fileData, error: downloadError } = await check.supabase.storage
    .from("contracte")
    .download(draft.storage_path);
  if (downloadError || !fileData) {
    return { success: false, message: downloadError?.message ?? "Nu am putut descarca draft-ul." };
  }

  const { mergeContractTemplate } = await import("@/lib/contracte/merge");
  const { mapeazaPartenerLaPlaceholdere } = await import("@/lib/contracte/mapare");

  const templateBuffer = Buffer.from(await fileData.arrayBuffer());
  const placeholders = mapeazaPartenerLaPlaceholdere(partner);

  let mergedBuffer: Buffer;
  try {
    mergedBuffer = mergeContractTemplate(templateBuffer, placeholders);
  } catch (err) {
    console.error("genereazaContractTestAction - merge error:", err);
    const detalii = extraeDetaliiEroareDocx(err);
    return {
      success: false,
      message: detalii ? `Eroare la completarea draft-ului: ${detalii}` : "Eroare la completarea draft-ului - verifica daca fisierul e un .docx valid.",
    };
  }

  const outputPath = `generate/${Date.now()}_${draft.nume.replace(/[^a-zA-Z0-9.\-_]/g, "_")}.docx`;
  const { error: uploadError } = await check.supabase.storage.from("contracte").upload(outputPath, mergedBuffer, {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    upsert: false,
  });
  if (uploadError) return { success: false, message: uploadError.message };

  const { data: inserted, error: insertError } = await check.supabase
    .from("contracte_generate")
    .insert({
      partner_id: partnerId,
      draft_id: draftId,
      storage_path: outputPath,
      status: "generat",
      created_by: check.userId,
    })
    .select("id")
    .single();

  if (insertError) {
    await check.supabase.storage.from("contracte").remove([outputPath]);
    return { success: false, message: insertError.message };
  }

  revalidatePath("/contracte/generate");

  const { data: signedUrlData } = await check.supabase.storage
    .from("contracte")
    .createSignedUrl(outputPath, 3600);

  return { success: true, message: "Contract generat.", contractId: inserted.id, downloadUrl: signedUrlData?.signedUrl };
}

/** Extrage un rezumat scurt, util, dintr-o eroare de la docxtemplater
 * (care vine de obicei cu o lista de sub-erori detaliate) - ca sa nu mai
 * trebuiasca reprodusa manual eroarea ca sa stim ce s-a intamplat. */
function extraeDetaliiEroareDocx(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;
  const properties = (err as { properties?: { errors?: unknown[] } }).properties;
  if (!properties?.errors || !Array.isArray(properties.errors)) return null;

  const primele = properties.errors.slice(0, 3).map((e) => {
    const eObj = e as { properties?: { explanation?: string } };
    return eObj.properties?.explanation ?? "eroare necunoscuta";
  });
  return primele.join("; ");
}

/**
 * Editeaza metadatele unui contract generat (status, observatii de
 * validare) si, optional, il poate re-asocia altui partener/draft - util
 * daca s-a generat gresit sau daca s-a corectat manual dupa.
 */
export async function actualizeazaContractGeneratAction(
  id: string,
  payload: { status: string; note_validare: string | null; partner_id: string | null }
): Promise<{ success: boolean; message?: string }> {
  const check = await requireAdminOrEditor();
  if (!check.ok) return { success: false, message: check.message };

  const { error } = await check.supabase
    .from("contracte_generate")
    .update({
      status: payload.status,
      note_validare: payload.note_validare,
      partner_id: payload.partner_id,
    })
    .eq("id", id);
  if (error) return { success: false, message: error.message };

  revalidatePath("/contracte/generate");
  return { success: true };
}

/** Sterge un contract generat - atat inregistrarea, cat si fisierul din
 * Storage. */
export async function stergeContractGeneratAction(id: string): Promise<{ success: boolean; message?: string }> {
  const check = await requireAdminOrEditor();
  if (!check.ok) return { success: false, message: check.message };

  const { data: contract } = await check.supabase
    .from("contracte_generate")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  const { error } = await check.supabase.from("contracte_generate").delete().eq("id", id);
  if (error) return { success: false, message: error.message };

  if (contract?.storage_path) {
    await check.supabase.storage.from("contracte").remove([contract.storage_path]);
  }

  revalidatePath("/contracte/generate");
  return { success: true };
}

/**
 * Inlocuieste fisierul unui contract deja generat, cu o versiune editata
 * manual (ex. dupa ce ai corectat ceva direct in Word) - pastreaza acelasi
 * storage_path, doar suprascrie continutul.
 */
export async function inlocuiesteFisierContractGeneratAction(
  id: string,
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  const check = await requireAdminOrEditor();
  if (!check.ok) return { success: false, message: check.message };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, message: "Selecteaza un fisier .docx." };
  }
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return { success: false, message: "Doar fisiere .docx sunt acceptate." };
  }

  const { data: contract } = await check.supabase
    .from("contracte_generate")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  if (!contract) return { success: false, message: "Contractul nu a fost gasit." };

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await check.supabase.storage.from("contracte").upload(contract.storage_path, arrayBuffer, {
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    upsert: true,
  });
  if (uploadError) return { success: false, message: uploadError.message };

  revalidatePath("/contracte/generate");
  return { success: true, message: "Fisier inlocuit." };
}

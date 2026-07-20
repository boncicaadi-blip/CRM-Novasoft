"use server";

import AdmZip from "adm-zip";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { parseAnafInvoiceXml } from "@/lib/anaf-invoice-parser";

const ANAF_TOKEN_URL = "https://logincert.anaf.ro/anaf-oauth2/v1/token";
const ANAF_API_BASE = "https://api.anaf.ro/prod/FCTEL/rest";

interface AnafExtra {
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  connected_at?: string;
  cif?: string;
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

async function requireAdminSupabase() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { ok: false as const, message: "Trebuie sa fii autentificat." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  if (profile?.role !== "admin") {
    return { ok: false as const, message: "Doar administratorii pot sincroniza facturi ANAF." };
  }
  return { ok: true as const, supabase };
}

/**
 * Salveaza CIF-ul folosit pentru interogarea listei de mesaje ANAF
 * (Setari -> Integrari). Separat de Client ID/Secret, care se salveaza in
 * acelasi rand din api_credentials.
 */
export async function saveAnafCifAction(formData: FormData): Promise<{ success: boolean; message?: string }> {
  const check = await requireAdminSupabase();
  if (!check.ok) return { success: false, message: check.message };

  const cif = (formData.get("cif") as string)?.trim().replace(/^RO/i, "");
  if (!cif) return { success: false, message: "CIF-ul este obligatoriu." };

  const { data } = await check.supabase.from("api_credentials").select("extra").eq("id", "anaf").single();
  const extra = (data?.extra as AnafExtra | null) ?? {};

  const { error } = await check.supabase
    .from("api_credentials")
    .update({ extra: { ...extra, cif } })
    .eq("id", "anaf");

  if (error) return { success: false, message: error.message };

  revalidatePath("/setari/integrari");
  return { success: true, message: "CIF salvat." };
}

async function getValidAccessToken(
  supabase: SupabaseServerClient
): Promise<{ token: string; cif: string } | { error: string }> {
  const { data } = await supabase.from("api_credentials").select("username, password, extra").eq("id", "anaf").single();
  const extra = (data?.extra as AnafExtra | null) ?? {};

  if (!extra.access_token || !extra.refresh_token) {
    return { error: "Nu esti conectat la SPV. Mergi in Setari -> Integrari si conecteaza-te intai." };
  }
  if (!extra.cif) {
    return { error: "Completeaza CIF-ul firmei in Setari -> Integrari inainte de sincronizare." };
  }

  const expiresAt = extra.expires_at ? new Date(extra.expires_at) : null;
  const expiringSoon = !expiresAt || expiresAt.getTime() - Date.now() < 24 * 3600 * 1000;

  if (!expiringSoon) {
    return { token: extra.access_token, cif: extra.cif };
  }

  if (!data?.username || !data?.password) {
    return { error: "Client ID/Secret lipsesc din Setari -> Integrari." };
  }

  const basicAuth = Buffer.from(`${data.username}:${data.password}`).toString("base64");
  const refreshResp = await fetch(ANAF_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${basicAuth}` },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: extra.refresh_token }).toString(),
  });

  if (!refreshResp.ok) {
    return {
      error: `Reimprospatarea tokenului a esuat (${refreshResp.status}). Incearca sa reconectezi manual SPV din Setari -> Integrari.`,
    };
  }

  const tokenData = (await refreshResp.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
  };

  const newExpiresAt = new Date(Date.now() + (tokenData.expires_in ?? 90 * 24 * 3600) * 1000).toISOString();
  const newExtra: AnafExtra = {
    ...extra,
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token ?? extra.refresh_token,
    expires_at: newExpiresAt,
  };

  await supabase.from("api_credentials").update({ extra: newExtra }).eq("id", "anaf");

  return { token: tokenData.access_token, cif: extra.cif };
}

interface AnafMesaj {
  id?: string | number;
  id_solicitare?: string | number;
  data_creare?: string;
  tip?: string;
  detalii?: string;
  cif_emitent?: string;
  cif_beneficiar?: string;
}

async function matchAnafFacturiWithExisting(supabase: SupabaseServerClient) {
  const { data: noi } = await supabase.from("anaf_facturi").select("id, tip, nr_factura").eq("stare", "noua");
  if (!noi || noi.length === 0) return;

  for (const factura of noi) {
    if (!factura.nr_factura) continue;

    if (factura.tip === "emisa") {
      const { data: match } = await supabase
        .from("creante")
        .select("id")
        .eq("nr_factura", factura.nr_factura)
        .limit(1)
        .maybeSingle();
      if (match) {
        await supabase.from("anaf_facturi").update({ stare: "potrivita", creanta_id: match.id }).eq("id", factura.id);
      }
    } else {
      const { data: match } = await supabase
        .from("obligatii")
        .select("id")
        .eq("nr_factura", factura.nr_factura)
        .limit(1)
        .maybeSingle();
      if (match) {
        await supabase.from("anaf_facturi").update({ stare: "potrivita", obligatie_id: match.id }).eq("id", factura.id);
      }
    }
  }
}

interface AnafFacturaPentruImport {
  id: string;
  tip: "emisa" | "primita";
  nr_factura: string | null;
  nume_partener: string | null;
  data_factura: string | null;
  valoare: number | null;
}

/**
 * Importa facturile selectate (doar cele cu stare 'noua') in Creante (daca
 * tip='emisa') sau Obligatii (daca tip='primita'), in functie de tipul
 * fiecarei facturi - un singur buton, ambele directii, exact ca in Excel-ul
 * pe care il inlocuieste acest modul.
 */
export async function importAnafFacturiAction(
  ids: string[]
): Promise<{ success: boolean; message: string; nrImportate?: number }> {
  const check = await requireAdminSupabase();
  if (!check.ok) return { success: false, message: check.message };
  const { supabase } = check;

  if (ids.length === 0) return { success: false, message: "Nicio factura selectata." };

  const { data: facturi, error: fetchError } = await supabase
    .from("anaf_facturi")
    .select("id, tip, nr_factura, nume_partener, data_factura, valoare")
    .in("id", ids)
    .eq("stare", "noua");

  if (fetchError) return { success: false, message: fetchError.message };

  const deImportat = (facturi ?? []) as AnafFacturaPentruImport[];
  if (deImportat.length === 0) {
    return { success: false, message: "Facturile selectate nu mai sunt in starea 'noua' (au fost deja procesate)." };
  }

  let nrImportate = 0;
  const erori: string[] = [];

  for (const f of deImportat) {
    if (!f.nr_factura || f.valoare === null) {
      erori.push(`${f.nr_factura ?? "(fara numar)"}: lipsesc date esentiale (numar sau valoare) - verifica manual arhiva.`);
      continue;
    }

    if (f.tip === "emisa") {
      const { data: creantaNoua, error: insertError } = await supabase
        .from("creante")
        .insert({
          nr_factura: f.nr_factura,
          nume_firma: f.nume_partener ?? "Partener necunoscut",
          data_factura: f.data_factura,
          total_factura: f.valoare,
        })
        .select("id")
        .single();

      if (insertError) {
        erori.push(`${f.nr_factura}: ${insertError.message}`);
        continue;
      }

      await supabase.from("anaf_facturi").update({ stare: "importata", creanta_id: creantaNoua.id }).eq("id", f.id);
      nrImportate += 1;
    } else {
      const { data: obligatieNoua, error: insertError } = await supabase
        .from("obligatii")
        .insert({
          nr_factura: f.nr_factura,
          nume_furnizor: f.nume_partener ?? "Partener necunoscut",
          data_factura: f.data_factura,
          total_factura: f.valoare,
        })
        .select("id")
        .single();

      if (insertError) {
        erori.push(`${f.nr_factura}: ${insertError.message}`);
        continue;
      }

      await supabase.from("anaf_facturi").update({ stare: "importata", obligatie_id: obligatieNoua.id }).eq("id", f.id);
      nrImportate += 1;
    }
  }

  revalidatePath("/setari/e-factura");
  revalidatePath("/creante");
  revalidatePath("/obligatii");

  const parts = [`${nrImportate} facturi importate.`];
  if (erori.length > 0) parts.push(`${erori.length} probleme: ${erori.slice(0, 3).join("; ")}`);

  return { success: nrImportate > 0, message: parts.join(" "), nrImportate };
}
/**
 * Sincronizeaza facturile din SPV: cere lista de mesaje pe ultimele 60 de
 * zile (maximul permis de ANAF), descarca doar mesajele noi (dedup dupa
 * id-ul mesajului ANAF), le parseaza si le potriveste cu Creante/Obligatii
 * existente dupa numarul de factura.
 *
 * Nota: aceasta este prima versiune, nu a putut fi testata impotriva unui
 * cont real conectat inainte de livrare - structura raspunsului ANAF (nume
 * exacte de campuri in lista de mesaje) e posibil sa difere usor fata de
 * documentatie. Daca prima sincronizare esueaza sau vine goala desi exista
 * facturi, mesajul de eroare/succes de mai jos ar trebui sa arate destule
 * detalii ca sa corectez rapid.
 */
export async function syncAnafFacturiAction(): Promise<{ success: boolean; message: string; nrNoi?: number }> {
  const check = await requireAdminSupabase();
  if (!check.ok) return { success: false, message: check.message };
  const { supabase } = check;

  const tokenResult = await getValidAccessToken(supabase);
  if ("error" in tokenResult) return { success: false, message: tokenResult.error };
  const { token, cif } = tokenResult;

  const listUrl = `${ANAF_API_BASE}/listaMesajeFactura?zile=60&cif=${encodeURIComponent(cif)}`;

  let listResp: Response;
  try {
    listResp = await fetch(listUrl, { headers: { Authorization: `Bearer ${token}` } });
  } catch (err) {
    return { success: false, message: `Eroare de retea la ANAF: ${err instanceof Error ? err.message : String(err)}` };
  }

  if (!listResp.ok) {
    const text = await listResp.text();
    return { success: false, message: `ANAF a raspuns cu eroare (${listResp.status}): ${text.slice(0, 300)}` };
  }

  const listData = (await listResp.json()) as { mesaje?: AnafMesaj[]; eroare?: string };

  if (listData.eroare) {
    return { success: false, message: `ANAF: ${listData.eroare}` };
  }

  const mesaje = listData.mesaje ?? [];
  if (mesaje.length === 0) {
    return {
      success: true,
      message: "Niciun mesaj in ultimele 60 de zile (sau contul nu are inca facturi in SPV).",
      nrNoi: 0,
    };
  }

  const { data: existente } = await supabase.from("anaf_facturi").select("mesaj_id_anaf");
  const existenteSet = new Set((existente ?? []).map((r) => r.mesaj_id_anaf));

  let nrNoi = 0;
  const erori: string[] = [];

  for (const msg of mesaje) {
    const mesajId = String(msg.id ?? msg.id_solicitare ?? "");
    if (!mesajId || existenteSet.has(mesajId)) continue;

    const tipRaw = (msg.tip ?? "").toUpperCase();
    let tip: "emisa" | "primita" | null = null;
    if (tipRaw.includes("TRIMISA")) tip = "emisa";
    else if (tipRaw.includes("PRIMITA")) tip = "primita";
    if (!tip) continue; // ERORI FACTURA / MESAJ CUMPARATOR - nu sunt facturi propriu-zise

    try {
      const downloadResp = await fetch(`${ANAF_API_BASE}/descarcare?id=${encodeURIComponent(mesajId)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!downloadResp.ok) {
        erori.push(`Mesaj ${mesajId}: descarcare esuata (${downloadResp.status})`);
        continue;
      }
      const zipBuffer = Buffer.from(await downloadResp.arrayBuffer());

      let parsed = null;
      try {
        const zip = new AdmZip(zipBuffer);
        const xmlEntry = zip
          .getEntries()
          .find((e) => e.entryName.toLowerCase().endsWith(".xml") && !e.entryName.toLowerCase().includes("semnatura"));
        if (xmlEntry) {
          parsed = parseAnafInvoiceXml(xmlEntry.getData().toString("utf-8"));
        }
      } catch (zipErr) {
        erori.push(`Mesaj ${mesajId}: continut ZIP nu a putut fi citit (${zipErr instanceof Error ? zipErr.message : "eroare"})`);
      }

      const storagePath = `${mesajId}.zip`;
      await supabase.storage.from("facturi-anaf").upload(storagePath, zipBuffer, {
        contentType: "application/zip",
        upsert: true,
      });

      const cifPartener = tip === "emisa" ? (msg.cif_beneficiar ?? parsed?.cifClient) : (msg.cif_emitent ?? parsed?.cifFurnizor);
      const numePartener = tip === "emisa" ? parsed?.numeClient : parsed?.numeFurnizor;

      const { error: insertError } = await supabase.from("anaf_facturi").insert({
        mesaj_id_anaf: mesajId,
        tip,
        cui_partener: cifPartener ?? null,
        nume_partener: numePartener ?? null,
        nr_factura: parsed?.nrFactura ?? null,
        data_factura: parsed?.dataFactura ?? null,
        valoare: parsed?.valoare ?? null,
        moneda: parsed?.moneda ?? "RON",
        storage_path: storagePath,
        stare: "noua",
      });

      if (insertError) {
        erori.push(`Mesaj ${mesajId}: ${insertError.message}`);
        continue;
      }
      nrNoi += 1;
    } catch (err) {
      erori.push(`Mesaj ${mesajId}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await matchAnafFacturiWithExisting(supabase);

  revalidatePath("/setari/integrari");
  revalidatePath("/creante");
  revalidatePath("/obligatii");

  const parts = [`${nrNoi} facturi noi descarcate din ${mesaje.length} mesaje gasite.`];
  if (erori.length > 0) parts.push(`${erori.length} probleme: ${erori.slice(0, 3).join("; ")}`);

  return { success: true, message: parts.join(" "), nrNoi };
}

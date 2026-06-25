/**
 * Script de import: citeste foaia "Pipeline" din Excel-ul existent si
 * insereaza toate randurile in tabela `opportunities` din Supabase.
 *
 * Rulare:
 *   1. npm install xlsx @supabase/supabase-js dotenv  (o singura data)
 *   2. Seteaza in .env.local (sau direct ca variabile de mediu):
 *        NEXT_PUBLIC_SUPABASE_URL=...
 *        SUPABASE_SERVICE_ROLE_KEY=...   <- din Supabase: Project Settings -> API -> service_role
 *        (service_role e necesar pentru import in bulk, ignora RLS)
 *   3. node --experimental-strip-types scripts/import-from-excel.ts /path/catre/Strategie_comerciala_2026.xlsx
 *
 * Scriptul:
 *  - Creeaza automat profilurile pentru "Responsabil vanzare" care nu exista (cu o parola temporara).
 *  - Mapeaza Da/Nu -> boolean.
 *  - Lasa coloanele de Forecast neimportate (sunt generate automat de DB din Probability).
 */

import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const filePath = process.argv[2];

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Seteaza NEXT_PUBLIC_SUPABASE_URL si SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (!filePath || !fs.existsSync(filePath)) {
  console.error("Da ca argument calea catre fisierul .xlsx. Ex:");
  console.error("  node import-from-excel.ts ./Strategie_comerciala_2026.xlsx");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

function toBool(v: unknown): boolean {
  if (typeof v !== "string") return false;
  return v.trim().toUpperCase() === "DA";
}

function toDateString(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return null;
}

function toNum(v: unknown): number {
  if (typeof v === "number") return v;
  return 0;
}

async function ensureProfile(fullName: string | null): Promise<string | null> {
  if (!fullName) return null;

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("full_name", fullName)
    .maybeSingle();

  if (existing) return existing.id;

  // Creeaza un user nou in auth (cu email placeholder) + profil asociat.
  const emailSlug = fullName.toLowerCase().replace(/[^a-z]+/g, ".");
  const email = `${emailSlug}@import.local`;

  const { data: created, error } = await supabase.auth.admin.createUser({
    email,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error || !created?.user) {
    console.warn(`Nu am putut crea profil pentru "${fullName}":`, error?.message);
    return null;
  }

  // trigger-ul handle_new_user populeaza deja profiles, dar asteptam putin
  // ca sa fim siguri ca a apucat sa ruleze.
  await new Promise((r) => setTimeout(r, 300));
  return created.user.id;
}

async function main() {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets["Pipeline"];
  if (!ws) {
    console.error('Nu am gasit foaia "Pipeline" in fisier.');
    process.exit(1);
  }

  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: null });
  console.log(`Am gasit ${rows.length} randuri in foaia Pipeline.`);

  const profileCache = new Map<string, string | null>();

  let inserted = 0;
  let failed = 0;

  for (const row of rows) {
    const numeGrup = row["Nume Grup"] as string | null;
    const numePotential = row["Nume Potential"] as string | null;
    if (!numeGrup || !numePotential) {
      console.warn("Rand fara Nume Grup / Nume Potential, il ignor.");
      continue;
    }

    const responsabilNume = row["Responsabil vanzare"] as string | null;
    let responsabilId: string | null = null;
    if (responsabilNume) {
      if (!profileCache.has(responsabilNume)) {
        profileCache.set(responsabilNume, await ensureProfile(responsabilNume));
      }
      responsabilId = profileCache.get(responsabilNume) ?? null;
    }

    const payload = {
      nume_grup: numeGrup,
      nume_potential: numePotential,
      cod_fiscal: row["Cod fiscal"] ? String(row["Cod fiscal"]) : null,
      responsabil_vanzare_id: responsabilId,
      domeniul_activitate: row["Domeniul de activitate"] ?? null,
      judet: row["Judet"] ?? null,
      oras: row["Oras"] ?? null,

      solutia_existenta: row["Solutia existenta"] ?? null,
      client_novasoft: toBool(row["Client Novasoft"]),
      client_windsoft: toBool(row["Client WindSoft"]),
      produs_serviciu_propus: row["Produs & Serviciu propus"] ?? null,
      contabilitate_interna: row["Contabilitate interna"] ?? null,
      solutie_contabilitate: row["Solutie contabilitate"] ?? null,
      mai_multe_firme_grup: toBool(row["Mai multe firme in grup"]),
      nr_societati_suplimentare: row["Nr societati suplimentare"] ? toNum(row["Nr societati suplimentare"]) : null,
      nume_societati_suplimentare: row["Nume societati suplimentare"] ?? null,
      potential_fonduri_europene: toBool(row["Potential fonduri europene"]),
      furnizori_combustibil_1: row["Furnizori combustibil 1"] ?? null,
      furnizori_combustibil_2: row["Furnizori combustibil 2"] ?? null,
      furnizori_combustibil_3: row["Furnizori combustibil 3"] ?? null,
      furnizori_gps_1: row["Furnizori GPS 1"] ?? null,
      furnizori_gps_2: row["Furnizori GPS 2"] ?? null,
      interes_planificator: toBool(row["Prezinta interes pentru planificator"]),
      nr_vehicule: row["Nr vehicule"] ? toNum(row["Nr vehicule"]) : null,
      detalii_suplimentare_software: row["Detalii suplimentare solutie software"] ?? null,

      data_contactarii: toDateString(row["Data contactarii"]),
      stage: row["Stage"] ?? "Suspect",
      status: row["Status"] ?? "Activa",
      substatus: row["Substatus"] ?? null,
      motivatia_substatusului: row["Motivatia substatusului"] ?? null,
      probability: toNum(row["Probability"]),

      actiune: row["Actiune"] ?? null,
      data_actiune: toDateString(row["Data Actiune"]),
      status_actiune: row["Status Actiune"] ?? null,
      data_finalizare_actiune: toDateString(row["Data Finalizare Actiune"]),
      observatii_actiune: row["Observatii Actiune"] ?? null,

      tip_proiect: row["Tip proiect"] ?? null,
      nr_utilizatori_synergo: row["Nr utilizatori solicitati Synergo"]
        ? toNum(row["Nr utilizatori solicitati Synergo"])
        : null,
      valoare_saas_anuala: toNum(row["Valoare SaaS Anuala"]),
      valoare_pachet_server_anual: toNum(row["Valoare Pachet Server Anual"]),
      valoare_firma_suplimentara: toNum(row["Valoare firma suplimentara"]),
      arr_synergo: toNum(row["ARR Synergo"]),
      mrr_synergo: toNum(row["MRR Synergo"]),
      valoare_pret_per_user: toNum(row["Valoare pret / user"]),
      pachet_synergo_onpremise: toNum(row["Pachet Synergo OnPremise"]),
      licenta_companie_suplimentara: toNum(row["Licenta companie suplimentara"]),
      licenta_useri_suplimentari_onpremise: toNum(row["Licenta Useri suplimentari OnPremise"]),
      licenta_synergo_onpremise: toNum(row["Licenta Synergo OnPremise"]),
      valoare_mentenanta_per_user_onpremise: toNum(row["Valoare mentenanta per user On Premise"]),
      valoare_mentenanta_lunara_onpremise: toNum(row["Valoare mentenanta lunara Synergo OnPremise"]),
      valoare_implementare_synergo: toNum(row["Valoare implementare Synergo"]),

      canal_intrare: row["Canal intrare"] ?? null,
      nume_canal_intrare: row["Nume  canal intrare"] ?? row["Nume canal intrare"] ?? null,
      oportunitati: row["Oportunitati"] ?? null,
      feedback: row["Feedback"] ?? null,
      observatii: row["Observatii"] ?? null,
    };

    const { error } = await supabase.from("opportunities").insert(payload);
    if (error) {
      failed++;
      console.error(`Eroare la "${numePotential}":`, error.message);
    } else {
      inserted++;
    }
  }

  console.log(`\nImport finalizat: ${inserted} inserate, ${failed} esuate.`);
}

main();

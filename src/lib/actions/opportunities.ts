"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  getOpportunity,
} from "@/lib/data/opportunities";
import { validateOpportunityBusinessRules } from "@/lib/validation";
import type { OpportunityInsert } from "@/types/opportunity";

function parsePayload(formData: FormData): OpportunityInsert {
  const get = (key: string) => {
    const v = formData.get(key);
    return v === null || v === "" ? null : (v as string);
  };
  const getNum = (key: string) => {
    const v = get(key);
    return v === null ? null : Number(v);
  };
  const getBool = (key: string) => formData.get(key) === "on";

  return {
    nume_grup: get("nume_grup")!,
    nume_potential: get("nume_potential")!,
    cod_fiscal: get("cod_fiscal"),
    responsabil_vanzare_id: get("responsabil_vanzare_id"),
    domeniul_activitate: get("domeniul_activitate"),
    domeniul_activitate_id: get("domeniul_activitate_id"),
    judet: get("judet"),
    oras: get("oras"),
    cifra_afaceri: getNum("cifra_afaceri"),
    nr_angajati: getNum("nr_angajati"),

    solutia_existenta: get("solutia_existenta"),
    client_novasoft: getBool("client_novasoft"),
    client_windsoft: getBool("client_windsoft"),
    produs_serviciu_propus: get("produs_serviciu_propus"),
    produs_serviciu_propus_id: get("produs_serviciu_propus_id"),
    contabilitate_interna: get("contabilitate_interna"),
    solutie_contabilitate: get("solutie_contabilitate"),
    mai_multe_firme_grup: getBool("mai_multe_firme_grup"),
    nr_societati_suplimentare: getNum("nr_societati_suplimentare"),
    nume_societati_suplimentare: get("nume_societati_suplimentare"),
    potential_fonduri_europene: getBool("potential_fonduri_europene"),
    furnizori_combustibil_1: get("furnizori_combustibil_1"),
    furnizori_combustibil_2: get("furnizori_combustibil_2"),
    furnizori_combustibil_3: get("furnizori_combustibil_3"),
    furnizori_gps_1: get("furnizori_gps_1"),
    furnizori_gps_2: get("furnizori_gps_2"),
    interes_planificator: getBool("interes_planificator"),
    nr_vehicule: getNum("nr_vehicule"),
    detalii_suplimentare_software: get("detalii_suplimentare_software"),

    data_contactarii: get("data_contactarii"),
    stage: get("stage") ?? "Suspect",
    stage_id: get("stage_id"),
    status: get("status") ?? "Activa",
    status_id: get("status_id"),
    substatus: get("substatus"),
    motivatia_substatusului: get("motivatia_substatusului"),
    probability: getNum("probability") ?? 0,
    motiv_pierdere: get("motiv_pierdere"),
    motiv_pierdere_id: get("motiv_pierdere_id"),
    motiv_amanare: get("motiv_amanare"),
    motiv_amanare_id: get("motiv_amanare_id"),
    data_revenire: get("data_revenire"),

    actiune: get("actiune"),
    actiune_id: get("actiune_id"),
    data_actiune: get("data_actiune"),
    status_actiune: get("status_actiune"),
    status_actiune_id: get("status_actiune_id"),
    data_finalizare_actiune: get("data_finalizare_actiune"),
    observatii_actiune: get("observatii_actiune"),

    tip_proiect: get("tip_proiect"),
    tip_proiect_id: get("tip_proiect_id"),
    pricing_mode: (get("pricing_mode") as "saas" | "onpremise") ?? "saas",
    nr_utilizatori_synergo: getNum("nr_utilizatori_synergo"),
    valoare_pachet_server_anual: getNum("valoare_pachet_server_anual") ?? 0,
    valoare_firma_suplimentara: getNum("valoare_firma_suplimentara") ?? 0,
    mrr_synergo: getNum("mrr_synergo") ?? 0,
    pachet_synergo_onpremise: getNum("pachet_synergo_onpremise") ?? 0,
    licenta_companie_suplimentara: getNum("licenta_companie_suplimentara") ?? 0,
    licenta_useri_suplimentari_onpremise:
      getNum("licenta_useri_suplimentari_onpremise") ?? 0,
    valoare_mentenanta_per_user_onpremise:
      getNum("valoare_mentenanta_per_user_onpremise") ?? 0,
    valoare_implementare_synergo: getNum("valoare_implementare_synergo") ?? 0,

    canal_intrare: get("canal_intrare"),
    canal_intrare_id: get("canal_intrare_id"),
    nume_canal_intrare: get("nume_canal_intrare"),
    oportunitati: get("oportunitati"),
    feedback: get("feedback"),
    observatii: get("observatii"),
  };
}

export async function createOpportunityAction(
  formData: FormData
): Promise<{ success: boolean; message?: string }> {
  const payload = parsePayload(formData);
  const errors = validateOpportunityBusinessRules({
    status: payload.status ?? "Activa",
    actiune: payload.actiune ?? null,
    data_actiune: payload.data_actiune ?? null,
    responsabil_vanzare_id: payload.responsabil_vanzare_id ?? null,
    motiv_pierdere: payload.motiv_pierdere ?? null,
    motiv_amanare: payload.motiv_amanare ?? null,
    data_revenire: payload.data_revenire ?? null,
  });
  if (errors.length > 0) return { success: false, message: errors.join(" ") };

  const opp = await createOpportunity(payload);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  redirect(`/oportunitati/${opp.id}`);
}

export async function updateOpportunityAction(
  id: string,
  formData: FormData
): Promise<{ success: boolean; message?: string }> {
  const payload = parsePayload(formData);
  const errors = validateOpportunityBusinessRules({
    status: payload.status ?? "Activa",
    actiune: payload.actiune ?? null,
    data_actiune: payload.data_actiune ?? null,
    responsabil_vanzare_id: payload.responsabil_vanzare_id ?? null,
    motiv_pierdere: payload.motiv_pierdere ?? null,
    motiv_amanare: payload.motiv_amanare ?? null,
    data_revenire: payload.data_revenire ?? null,
  });
  if (errors.length > 0) return { success: false, message: errors.join(" ") };

  await updateOpportunity(id, payload);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  revalidatePath(`/oportunitati/${id}`);
  return { success: true };
}

export async function updateOpportunityStageAction(id: string, stage: string) {
  await updateOpportunity(id, { stage });
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}

export async function updateOpportunityActionDateAction(id: string, dataActiune: string) {
  await updateOpportunity(id, { data_actiune: dataActiune });
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
}

/**
 * Update inline pe o singura sectiune a fisei oportunitatii (folosit din
 * vederea de ansamblu, unde fiecare caseta se editeaza independent, fara
 * sa treaca prin formularul wizard complet).
 */
export async function updateOpportunitySectionAction(
  id: string,
  formData: FormData
): Promise<{ success: boolean; message?: string }> {
  const get = (key: string) => {
    const v = formData.get(key);
    return v === null || v === "" ? null : (v as string);
  };
  const getNum = (key: string) => {
    const v = get(key);
    return v === null ? null : Number(v);
  };
  const getBool = (key: string) => formData.get(key) === "on";

  const payload: Record<string, unknown> = {};
  const fields = formData.get("__fields") as string;
  const fieldList = fields ? fields.split(",") : [];

  const numericFields = new Set([
    "nr_societati_suplimentare",
    "nr_vehicule",
    "probability",
    "nr_utilizatori_synergo",
    "valoare_implementare_synergo",
    "mrr_synergo",
    "valoare_pachet_server_anual",
    "valoare_firma_suplimentara",
    "pachet_synergo_onpremise",
    "licenta_companie_suplimentara",
    "licenta_useri_suplimentari_onpremise",
    "valoare_mentenanta_per_user_onpremise",
    "cifra_afaceri",
    "nr_angajati",
  ]);
  const boolFields = new Set([
    "client_novasoft",
    "client_windsoft",
    "mai_multe_firme_grup",
    "potential_fonduri_europene",
    "interes_planificator",
  ]);

  for (const field of fieldList) {
    if (!field) continue;
    if (numericFields.has(field)) {
      payload[field] = getNum(field);
    } else if (boolFields.has(field)) {
      payload[field] = getBool(field);
    } else {
      payload[field] = get(field);
    }
  }

  // Validam starea FINALA a oportunitatii (curenta din DB + modificarile din
  // acest card), nu doar campurile editate aici - altfel un card care nu
  // contine status/actiune ar putea "trece" validarea fara sa vada
  // problema reala (ex. editezi Firma pe o oportunitate Activa fara next step).
  const current = await getOpportunity(id);
  if (!current) return { success: false, message: "Oportunitatea nu a fost gasita." };

  const merged = { ...current, ...payload } as unknown as Record<string, unknown>;
  const errors = validateOpportunityBusinessRules({
    status: (merged.status as string) ?? "Activa",
    actiune: (merged.actiune as string | null) ?? null,
    data_actiune: (merged.data_actiune as string | null) ?? null,
    responsabil_vanzare_id: (merged.responsabil_vanzare_id as string | null) ?? null,
    motiv_pierdere: (merged.motiv_pierdere as string | null) ?? null,
    motiv_amanare: (merged.motiv_amanare as string | null) ?? null,
    data_revenire: (merged.data_revenire as string | null) ?? null,
  });
  if (errors.length > 0) return { success: false, message: errors.join(" ") };

  await updateOpportunity(id, payload);
  revalidatePath(`/oportunitati/${id}`);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * B-01 din modul Actiuni: finalizeaza actiunea curenta, cere rezultat
 * obligatoriu (salvat in observatii_actiune) si, daca e dat, programeaza
 * automat urmatorul pas (next step).
 */
export async function finalizeActionAction(
  opportunityId: string,
  rezultat: string,
  nextStep?: { actiune: string; dataActiune: string }
) {
  const updates: Record<string, unknown> = {
    status_actiune: "Finalizata",
    data_finalizare_actiune: new Date().toISOString().slice(0, 10),
    observatii_actiune: rezultat,
  };

  if (nextStep) {
    updates.actiune = nextStep.actiune;
    updates.data_actiune = nextStep.dataActiune;
    updates.status_actiune = "Planificata"; // urmatoarea actiune e activa, nu finalizata
  }

  await updateOpportunity(opportunityId, updates);
  revalidatePath("/actiuni");
  revalidatePath(`/oportunitati/${opportunityId}`);
  revalidatePath("/calendar");
}

/** Amana actiunea curenta cu N zile, pastrand aceeasi actiune/responsabil. */
export async function postponeActionAction(opportunityId: string, days: number) {
  const opp = await getOpportunity(opportunityId);
  if (!opp || !opp.data_actiune) return;

  const base = new Date(opp.data_actiune.slice(0, 10));
  base.setDate(base.getDate() + days);

  await updateOpportunity(opportunityId, { data_actiune: base.toISOString().slice(0, 10) });
  revalidatePath("/actiuni");
  revalidatePath("/calendar");
}

/** Reprogrameaza actiunea curenta la o data specifica aleasa de utilizator. */
export async function rescheduleActionAction(opportunityId: string, newDate: string) {
  await updateOpportunity(opportunityId, { data_actiune: newDate });
  revalidatePath("/actiuni");
  revalidatePath("/calendar");
}

export async function deleteOpportunityAction(id: string) {
  await deleteOpportunity(id);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  redirect("/pipeline");
}

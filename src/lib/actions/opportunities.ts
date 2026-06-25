"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
} from "@/lib/data/opportunities";
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
    judet: get("judet"),
    oras: get("oras"),

    solutia_existenta: get("solutia_existenta"),
    client_novasoft: getBool("client_novasoft"),
    client_windsoft: getBool("client_windsoft"),
    produs_serviciu_propus: get("produs_serviciu_propus"),
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
    status: get("status") ?? "Activa",
    substatus: get("substatus"),
    motivatia_substatusului: get("motivatia_substatusului"),
    probability: getNum("probability") ?? 0,

    actiune: get("actiune"),
    data_actiune: get("data_actiune"),
    status_actiune: get("status_actiune"),
    data_finalizare_actiune: get("data_finalizare_actiune"),
    observatii_actiune: get("observatii_actiune"),

    tip_proiect: get("tip_proiect"),
    nr_utilizatori_synergo: getNum("nr_utilizatori_synergo"),
    valoare_saas_anuala: getNum("valoare_saas_anuala") ?? 0,
    valoare_pachet_server_anual: getNum("valoare_pachet_server_anual") ?? 0,
    valoare_firma_suplimentara: getNum("valoare_firma_suplimentara") ?? 0,
    arr_synergo: getNum("arr_synergo") ?? 0,
    mrr_synergo: getNum("mrr_synergo") ?? 0,
    valoare_pret_per_user: getNum("valoare_pret_per_user") ?? 0,
    pachet_synergo_onpremise: getNum("pachet_synergo_onpremise") ?? 0,
    licenta_companie_suplimentara: getNum("licenta_companie_suplimentara") ?? 0,
    licenta_useri_suplimentari_onpremise:
      getNum("licenta_useri_suplimentari_onpremise") ?? 0,
    licenta_synergo_onpremise: getNum("licenta_synergo_onpremise") ?? 0,
    valoare_mentenanta_per_user_onpremise:
      getNum("valoare_mentenanta_per_user_onpremise") ?? 0,
    valoare_mentenanta_lunara_onpremise:
      getNum("valoare_mentenanta_lunara_onpremise") ?? 0,
    valoare_implementare_synergo: getNum("valoare_implementare_synergo") ?? 0,

    canal_intrare: get("canal_intrare"),
    nume_canal_intrare: get("nume_canal_intrare"),
    oportunitati: get("oportunitati"),
    feedback: get("feedback"),
    observatii: get("observatii"),
  };
}

export async function createOpportunityAction(formData: FormData) {
  const payload = parsePayload(formData);
  const opp = await createOpportunity(payload);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  redirect(`/oportunitati/${opp.id}`);
}

export async function updateOpportunityAction(id: string, formData: FormData) {
  const payload = parsePayload(formData);
  await updateOpportunity(id, payload);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  revalidatePath(`/oportunitati/${id}`);
}

export async function updateOpportunityStageAction(id: string, stage: string) {
  await updateOpportunity(id, { stage });
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
}

export async function deleteOpportunityAction(id: string) {
  await deleteOpportunity(id);
  revalidatePath("/pipeline");
  revalidatePath("/dashboard");
  redirect("/pipeline");
}

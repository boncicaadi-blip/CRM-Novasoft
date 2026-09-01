"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { trimiteEmail, emailCerereNoua, emailRaspunsCerere, FROM_CONCEDII } from "@/lib/email/concedii-email";
import { TIP_CONCEDIU_LABELS } from "@/types/concedii";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.nova-soft.ro";

/**
 * Verifica daca un interval nou se suprapune cu vreo cerere existenta
 * (in asteptare SAU deja aprobata) a aceluiasi angajat - indiferent de tip
 * (concediu de odihna, medical, eveniment special), ca sa nu poti cere
 * concediu peste zile deja ocupate. `exclusCerereId` exclude cererea
 * curenta din verificare (folosit la editare, ca sa nu se compare cu ea
 * insasi).
 */
async function verificaSuprapunere(
  supabase: Awaited<ReturnType<typeof createClient>>,
  angajatId: string,
  dataInceput: string,
  dataSfarsit: string,
  exclusCerereId?: string
): Promise<string | null> {
  let query = supabase
    .from("concedii_cereri")
    .select("id, tip, data_inceput, data_sfarsit, status")
    .eq("angajat_id", angajatId)
    .in("status", ["in_asteptare", "aprobat"])
    .lte("data_inceput", dataSfarsit)
    .gte("data_sfarsit", dataInceput);

  if (exclusCerereId) query = query.neq("id", exclusCerereId);

  const { data: suprapuneri } = await query;
  if (suprapuneri && suprapuneri.length > 0) {
    const c = suprapuneri[0];
    const tipLabel = TIP_CONCEDIU_LABELS[c.tip as keyof typeof TIP_CONCEDIU_LABELS] ?? c.tip;
    const statusLabel = c.status === "aprobat" ? "aprobata" : "in asteptare";
    return `Se suprapune cu o cerere existenta (${tipLabel}, ${statusLabel}): ${c.data_inceput} → ${c.data_sfarsit}.`;
  }
  return null;
}

async function requireAdminSupabase() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { ok: false as const, message: "Trebuie sa fii autentificat." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  // "editor" e tratat la fel ca "admin" pentru modulul Concedii - doar
  // "viewer" e restrictionat.
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { ok: false as const, message: "Doar administratorii si editorii pot gestiona modulul Concedii." };
  }
  return { ok: true as const, supabase };
}

export async function createAngajatAction(payload: {
  nume: string;
  functie: string | null;
  departament: string | null;
  data_angajare: string | null;
  manager_id: string | null;
  user_id: string | null;
  zile_alocate_an: number;
}): Promise<{ success: boolean; message: string }> {
  const check = await requireAdminSupabase();
  if (!check.ok) return { success: false, message: check.message };
  if (!payload.nume.trim()) return { success: false, message: "Numele este obligatoriu." };

  const { error } = await check.supabase.from("angajati").insert({
    nume: payload.nume.trim(),
    functie: payload.functie || null,
    departament: payload.departament || null,
    data_angajare: payload.data_angajare || null,
    manager_id: payload.manager_id || null,
    user_id: payload.user_id || null,
    zile_alocate_an: payload.zile_alocate_an,
  });
  if (error) return { success: false, message: error.message };

  revalidatePath("/concedii/angajati");
  return { success: true, message: "Angajat adaugat." };
}

export async function updateAngajatAction(
  id: string,
  payload: {
    nume: string;
    functie: string | null;
    departament: string | null;
    data_angajare: string | null;
    data_incetare: string | null;
    activ: boolean;
    manager_id: string | null;
    user_id: string | null;
    zile_alocate_an: number;
  }
): Promise<{ success: boolean; message: string }> {
  const check = await requireAdminSupabase();
  if (!check.ok) return { success: false, message: check.message };
  if (!payload.nume.trim()) return { success: false, message: "Numele este obligatoriu." };

  const { error } = await check.supabase
    .from("angajati")
    .update({
      nume: payload.nume.trim(),
      functie: payload.functie || null,
      departament: payload.departament || null,
      data_angajare: payload.data_angajare || null,
      data_incetare: payload.data_incetare || null,
      activ: payload.activ,
      manager_id: payload.manager_id || null,
      user_id: payload.user_id || null,
      zile_alocate_an: payload.zile_alocate_an,
    })
    .eq("id", id);
  if (error) return { success: false, message: error.message };

  revalidatePath("/concedii/angajati");
  revalidatePath("/concedii");
  return { success: true, message: "Angajat actualizat." };
}

/**
 * Angajatul isi trimite propria cerere - spre deosebire de
 * createConcediuAction (admin, intra direct "aprobat"), asta intra
 * "in_asteptare" si asteapta aprobarea managerului. Verifica el insusi ca
 * userul curent e cu adevarat legat de angajatul pentru care se face
 * cererea - nu poate cere concediu in numele altcuiva.
 */
export async function submitCerereConcediuAction(payload: {
  tip: string;
  data_inceput: string;
  data_sfarsit: string;
  nr_zile: number;
  observatii: string | null;
}): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false, message: "Trebuie sa fii autentificat." };

  const { data: angajat } = await supabase
    .from("angajati")
    .select("id, nume, manager_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!angajat) return { success: false, message: "Contul tau nu este asociat niciunui angajat din registru." };

  if (!payload.data_inceput || !payload.data_sfarsit) {
    return { success: false, message: "Intervalul de date este obligatoriu." };
  }

  const suprapunere = await verificaSuprapunere(supabase, angajat.id, payload.data_inceput, payload.data_sfarsit);
  if (suprapunere) return { success: false, message: suprapunere };

  const { error } = await supabase.from("concedii_cereri").insert({
    angajat_id: angajat.id,
    tip: payload.tip,
    data_inceput: payload.data_inceput,
    data_sfarsit: payload.data_sfarsit,
    nr_zile: payload.nr_zile,
    status: "in_asteptare",
    observatii: payload.observatii || null,
  });
  if (error) return { success: false, message: error.message };

  revalidatePath("/concedii/cererile-mele");
  revalidatePath("/concedii/aprobare");

  // Informare pe email catre manager - nu blocheaza raspunsul daca esueaza.
  if (angajat.manager_id) {
    const { data: manager } = await supabase
      .from("angajati")
      .select("user_id")
      .eq("id", angajat.manager_id)
      .maybeSingle();
    if (manager?.user_id) {
      const { data: profilManager } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", manager.user_id)
        .maybeSingle();
      if (profilManager?.email) {
        const { subject, html } = emailCerereNoua({
          numeAngajat: angajat.nume,
          tip: TIP_CONCEDIU_LABELS[payload.tip as keyof typeof TIP_CONCEDIU_LABELS] ?? payload.tip,
          dataInceput: payload.data_inceput,
          dataSfarsit: payload.data_sfarsit,
          nrZile: payload.nr_zile,
          observatii: payload.observatii,
          linkAprobare: `${APP_URL}/concedii/aprobare`,
        });
        await trimiteEmail({ to: profilManager.email, subject, html, from: FROM_CONCEDII });
      }
    }
  }

  return { success: true, message: "Cerere trimisa - asteapta aprobarea managerului." };
}

/**
 * Managerul aproba sau respinge o cerere - verifica el insusi ca cel care
 * apasa butonul e chiar managerul angajatului respectiv (nu doar orice
 * utilizator autentificat).
 */
export async function raspundeLaCerereAction(
  cerereId: string,
  aprobat: boolean
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false, message: "Trebuie sa fii autentificat." };

  const { data: managerAngajat } = await supabase
    .from("angajati")
    .select("id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!managerAngajat) return { success: false, message: "Contul tau nu este asociat niciunui angajat din registru." };

  const { data: cerere, error: cerereError } = await supabase
    .from("concedii_cereri")
    .select("id, angajat_id, tip, data_inceput, data_sfarsit, nr_zile")
    .eq("id", cerereId)
    .maybeSingle();
  if (cerereError) {
    console.error("raspundeLaCerereAction - eroare la citirea cererii:", cerereError.message);
    return { success: false, message: `Eroare la citirea cererii: ${cerereError.message}` };
  }
  if (!cerere) return { success: false, message: "Cererea nu a fost gasita." };

  const { data: angajatInfo, error: angajatError } = await supabase
    .from("angajati")
    .select("manager_id, user_id")
    .eq("id", cerere.angajat_id)
    .maybeSingle();
  if (angajatError) {
    console.error("raspundeLaCerereAction - eroare la citirea angajatului:", angajatError.message);
    return { success: false, message: `Eroare la citirea angajatului: ${angajatError.message}` };
  }

  const managerReal = angajatInfo?.manager_id;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userData.user.id).single();
  const esteAdmin = profile?.role === "admin" || profile?.role === "editor";

  if (!esteAdmin && managerReal !== managerAngajat.id) {
    return { success: false, message: "Nu esti managerul acestui angajat." };
  }

  const { error } = await supabase
    .from("concedii_cereri")
    .update({
      status: aprobat ? "aprobat" : "respins",
      aprobat_de: managerAngajat.id,
      data_aprobare: new Date().toISOString(),
      vazut_de_solicitant: false,
    })
    .eq("id", cerereId);
  if (error) return { success: false, message: error.message };

  revalidatePath("/concedii/aprobare");
  revalidatePath("/concedii/cererile-mele");
  revalidatePath("/concedii");

  // Informare pe email catre solicitant - nu blocheaza raspunsul daca esueaza.
  if (angajatInfo?.user_id) {
    const { data: profilSolicitant } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", angajatInfo.user_id)
      .maybeSingle();
    if (profilSolicitant?.email) {
      const { subject, html } = emailRaspunsCerere({
        aprobat,
        tip: TIP_CONCEDIU_LABELS[cerere.tip as keyof typeof TIP_CONCEDIU_LABELS] ?? cerere.tip,
        dataInceput: cerere.data_inceput,
        dataSfarsit: cerere.data_sfarsit,
        nrZile: cerere.nr_zile,
        linkCereri: `${APP_URL}/concedii/cererile-mele`,
      });
      await trimiteEmail({ to: profilSolicitant.email, subject, html, from: FROM_CONCEDII });
    }
  }

  return { success: true, message: aprobat ? "Cerere aprobata." : "Cerere respinsa." };
}

export async function createConcediuAction(payload: {
  angajat_id: string;
  tip: string;
  data_inceput: string;
  data_sfarsit: string;
  nr_zile: number;
  observatii: string | null;
}): Promise<{ success: boolean; message: string }> {
  const check = await requireAdminSupabase();
  if (!check.ok) return { success: false, message: check.message };
  if (!payload.angajat_id || !payload.data_inceput || !payload.data_sfarsit) {
    return { success: false, message: "Angajatul si intervalul de date sunt obligatorii." };
  }

  const suprapunere = await verificaSuprapunere(
    check.supabase,
    payload.angajat_id,
    payload.data_inceput,
    payload.data_sfarsit
  );
  if (suprapunere) return { success: false, message: suprapunere };

  const { error } = await check.supabase.from("concedii_cereri").insert({
    angajat_id: payload.angajat_id,
    tip: payload.tip,
    data_inceput: payload.data_inceput,
    data_sfarsit: payload.data_sfarsit,
    nr_zile: payload.nr_zile,
    status: "aprobat",
    observatii: payload.observatii || null,
    data_aprobare: new Date().toISOString(),
  });
  if (error) return { success: false, message: error.message };

  revalidatePath("/concedii");
  return { success: true, message: "Concediu inregistrat." };
}

export async function stergeConcediuAction(id: string): Promise<{ success: boolean; message: string }> {
  const check = await requireAdminSupabase();
  if (!check.ok) return { success: false, message: check.message };

  const { error } = await check.supabase.from("concedii_cereri").delete().eq("id", id);
  if (error) return { success: false, message: error.message };

  revalidatePath("/concedii");
  return { success: true, message: "Sters." };
}

export async function setSoldAction(
  angajat_id: string,
  an: number,
  zile_alocate: number
): Promise<{ success: boolean; message: string }> {
  const check = await requireAdminSupabase();
  if (!check.ok) return { success: false, message: check.message };

  const { error } = await check.supabase
    .from("concedii_sold")
    .upsert({ angajat_id, an, zile_alocate }, { onConflict: "angajat_id,an" });
  if (error) return { success: false, message: error.message };

  revalidatePath("/concedii");
  revalidatePath("/concedii/angajati");
  return { success: true, message: "Sold actualizat." };
}

/**
 * Angajatul isi editeaza o cerere existenta (a lui) - reseteaza automat
 * statusul la "in_asteptare" si sterge orice aprobare anterioara, ca sa
 * treaca din nou prin fluxul de aprobare (retrimitere + reaprobare).
 */
export async function editeazaCerereAction(
  cerereId: string,
  payload: {
    tip: string;
    data_inceput: string;
    data_sfarsit: string;
    nr_zile: number;
    observatii: string | null;
  }
): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData?.user) return { success: false, message: "Trebuie sa fii autentificat." };

  const { data: angajat } = await supabase
    .from("angajati")
    .select("id, nume, manager_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();
  if (!angajat) return { success: false, message: "Contul tau nu este asociat niciunui angajat din registru." };

  const { data: cerere } = await supabase
    .from("concedii_cereri")
    .select("id, angajat_id")
    .eq("id", cerereId)
    .single();
  if (!cerere) return { success: false, message: "Cererea nu a fost gasita." };
  if (cerere.angajat_id !== angajat.id) return { success: false, message: "Nu poti edita cererea altcuiva." };

  if (!payload.data_inceput || !payload.data_sfarsit) {
    return { success: false, message: "Intervalul de date este obligatoriu." };
  }

  const suprapunere = await verificaSuprapunere(
    supabase,
    angajat.id,
    payload.data_inceput,
    payload.data_sfarsit,
    cerereId
  );
  if (suprapunere) return { success: false, message: suprapunere };

  const { error } = await supabase
    .from("concedii_cereri")
    .update({
      tip: payload.tip,
      data_inceput: payload.data_inceput,
      data_sfarsit: payload.data_sfarsit,
      nr_zile: payload.nr_zile,
      observatii: payload.observatii || null,
      status: "in_asteptare",
      aprobat_de: null,
      data_aprobare: null,
    })
    .eq("id", cerereId);
  if (error) return { success: false, message: error.message };

  revalidatePath("/concedii/cererile-mele");
  revalidatePath("/concedii/aprobare");
  revalidatePath("/concedii");

  // Informare pe email catre manager, la fel ca la trimiterea initiala -
  // cererea a fost retrimisa, trebuie aprobata din nou.
  if (angajat.manager_id) {
    const { data: manager } = await supabase
      .from("angajati")
      .select("user_id")
      .eq("id", angajat.manager_id)
      .maybeSingle();
    if (manager?.user_id) {
      const { data: profilManager } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", manager.user_id)
        .maybeSingle();
      if (profilManager?.email) {
        const { html } = emailCerereNoua({
          numeAngajat: angajat.nume,
          tip: TIP_CONCEDIU_LABELS[payload.tip as keyof typeof TIP_CONCEDIU_LABELS] ?? payload.tip,
          dataInceput: payload.data_inceput,
          dataSfarsit: payload.data_sfarsit,
          nrZile: payload.nr_zile,
          observatii: payload.observatii,
          linkAprobare: `${APP_URL}/concedii/aprobare`,
        });
        await trimiteEmail({
          to: profilManager.email,
          subject: `Cerere de concediu actualizata - ${angajat.nume}`,
          html,
          from: FROM_CONCEDII,
        });
      }
    }
  }

  return { success: true, message: "Cerere actualizata - a fost retrimisa spre aprobare." };
}

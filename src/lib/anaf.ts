const ANAF_TVA_URL = "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva";

function cleanCui(cui: string): string {
  return cui.replace(/^RO/i, "").replace(/\D/g, "");
}

export interface AnafCompanyInfo {
  denumire: string | null;
  judet: string | null;
  oras: string | null;
  domeniulActivitate: string | null;
}

/**
 * Identificare firma dupa CUI - nume, judet, localitate, cod CAEN - direct
 * de la ANAF (serviciul public oficial de verificare platitor TVA, art. 316
 * Cod Fiscal), gratuit, fara autentificare, fara cont necesar. Inlocuieste
 * fosta integrare cu Termene.ro pentru aceasta categorie de date ("Date
 * companie") - Termene ramane folosit doar pentru verificarea denumirilor
 * (Setari -> Parteneri), unde categoria e deja activata pe cont.
 *
 * Documentatie oficiala:
 * https://static.anaf.ro/static/10/Anaf/Informatii_R/Servicii_web/doc_WS_V9.txt
 *
 * Nota: ANAF intoarce doar codul CAEN numeric (nu si denumirea CAEN) -
 * "domeniulActivitate" ramane deci doar codul, ca referinta; clasificarea
 * proprie (CE / TRM / TRM + CE) tot manual se seteaza, la fel ca inainte -
 * niciodata nu a putut fi auto-completata din nicio sursa externa, pentru
 * ca e o clasificare interna, nu una standard CAEN.
 */
export async function fetchAnafCompanyInfo(
  cuiRaw: string
): Promise<{ data: AnafCompanyInfo | null; error: string | null }> {
  const cui = cleanCui(cuiRaw);
  if (!cui) return { data: null, error: "CUI invalid." };

  try {
    const res = await fetch(ANAF_TVA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ cui: Number(cui), data: new Date().toISOString().slice(0, 10) }]),
      cache: "no-store",
    });

    if (!res.ok) {
      return { data: null, error: `ANAF a raspuns cu eroare ${res.status}.` };
    }

    const json = await res.json();
    const gasit = json?.found?.[0];

    if (!gasit) {
      return { data: null, error: `Nu am gasit nicio firma inregistrata cu CUI-ul ${cui} la ANAF.` };
    }

    const dateGenerale = gasit.date_generale ?? {};
    const adresaSediu = gasit.adresa_sediu_social ?? {};
    const adresaDomiciliu = gasit.adresa_domiciliu_fiscal ?? {};

    const denumire = dateGenerale.denumire ?? null;
    const judet = adresaSediu.sdenumire_Judet || adresaDomiciliu.ddenumire_Judet || null;
    const oras = adresaSediu.sdenumire_Localitate || adresaDomiciliu.ddenumire_Localitate || null;
    const domeniulActivitate = dateGenerale.cod_CAEN ? String(dateGenerale.cod_CAEN) : null;

    return { data: { denumire, judet, oras, domeniulActivitate }, error: null };
  } catch (error) {
    return {
      data: null,
      error: `Eroare de retea la apelarea ANAF: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

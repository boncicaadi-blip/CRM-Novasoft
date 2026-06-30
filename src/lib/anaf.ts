import { getTermeneCredentials } from "@/lib/data/apiCredentials";

const TERMENE_API_URL = "https://api.termene.ro/v2";

function cleanCui(cui: string): string {
  return cui.replace(/^RO/i, "").replace(/\D/g, "");
}

export interface AnafCompanyInfo {
  denumire: string | null;
  judet: string | null;
  oras: string | null;
  domeniulActivitate: string | null;
}

export interface TermeneCallResult {
  data: Record<string, unknown> | null;
  error: string | null;
}

/**
 * Apeleaza Termene.ro v2 - POST cu Basic Auth, body JSON {cui, schemaKey}.
 * Credentialele vin din tabela api_credentials (editabile din /setari/integrari),
 * nu din variabile de mediu, ca sa poata fi schimbate fara redeploy.
 *
 * Nota: cheia de configurare folosita aici (vezi contul Termene.ro) acopera
 * doar categoria "Date companie" (identificare, adresa, CAEN, TVA) - NU si
 * "Date financiare"/"Bilanturi", care e o categorie separata, neactivata pe
 * cheia curenta. De aceea functia de mai jos extrage doar identificare
 * firma, fara cifra de afaceri/nr angajati (eliminate intentionat - ar
 * produce mereu eroare cu cheia actuala).
 */
async function callTermene(cui: string): Promise<TermeneCallResult> {
  const creds = await getTermeneCredentials();
  if (!creds.username || !creds.password || !creds.schemaKey) {
    return {
      data: null,
      error: "Credentiale neconfigurate. Completeaza-le in Setari -> Integrari.",
    };
  }

  const encoded = Buffer.from(`${creds.username}:${creds.password}`).toString("base64");

  try {
    const res = await fetch(TERMENE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Basic ${encoded}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cui: Number(cui), schemaKey: creds.schemaKey }),
      cache: "no-store",
    });

    const rawText = await res.text();

    if (!res.ok) {
      return {
        data: null,
        error: `Termene.ro a raspuns cu eroare ${res.status}: ${rawText.slice(0, 300)}`,
      };
    }

    let json: Record<string, unknown>;
    try {
      json = JSON.parse(rawText);
    } catch {
      return {
        data: null,
        error: `Raspuns neasteptat de la Termene.ro (nu e JSON valid): ${rawText.slice(0, 300)}`,
      };
    }

    return { data: json, error: null };
  } catch (error) {
    return {
      data: null,
      error: `Eroare de retea la apelarea Termene.ro: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Identificare firma dupa CUI: nume, judet, oras, domeniu de activitate
 * (CAEN principal). Foloseste structura reala confirmata din raspuns live:
 * { firma: { nume_recom, ... }, adresa: { anaf/sediu_social: {...} },
 *   cod_caen: { principal_recom: { cod, label } } }.
 */
export async function fetchAnafCompanyInfo(
  cuiRaw: string
): Promise<{ data: AnafCompanyInfo | null; error: string | null }> {
  const cui = cleanCui(cuiRaw);
  if (!cui) return { data: null, error: "CUI invalid." };

  const { data: json, error } = await callTermene(cui);
  if (error || !json) return { data: null, error };

  const firma = json["firma"] as Record<string, unknown> | undefined;
  const adresa = json["adresa"] as Record<string, unknown> | undefined;
  const sediuSocial = adresa?.["sediu_social"] as Record<string, unknown> | undefined;
  const adresaAnaf = adresa?.["anaf"] as Record<string, unknown> | undefined;
  const codCaen = json["cod_caen"] as Record<string, unknown> | undefined;
  const principalRecom = codCaen?.["principal_recom"] as Record<string, unknown> | undefined;

  const denumire = (firma?.["nume_recom"] as string) ?? (firma?.["nume_mfinante"] as string) ?? null;
  const judet = (sediuSocial?.["judet"] as string) ?? (adresaAnaf?.["judet"] as string) ?? null;
  const oras =
    (sediuSocial?.["localitate"] as string) ?? (adresaAnaf?.["localitate"] as string) ?? null;
  const domeniulActivitate = principalRecom
    ? `${principalRecom.cod} - ${principalRecom.label}`
    : null;

  if (!denumire && !judet) {
    return {
      data: null,
      error: `Raspuns primit de la Termene.ro, dar fara date de identificare recognoscibile. Raspuns brut: ${JSON.stringify(json).slice(0, 500)}`,
    };
  }

  return { data: { denumire, judet, oras, domeniulActivitate }, error: null };
}

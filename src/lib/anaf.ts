import { getTermeneCredentials } from "@/lib/data/apiCredentials";

const TERMENE_API_URL = "https://api.termene.ro/v2";

// Curs RON -> EUR de rezerva, folosit doar daca Frankfurter API (curs real-time,
// gratuit, fara cheie - sursa BCE) e indisponibil. Valoare aproximativa iunie 2026.
const FALLBACK_RON_TO_EUR = 1 / 5.24;

let cachedRonToEur: { rate: number; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 ore - cursul se actualizeaza o data/zi

async function getRonToEurRate(): Promise<number> {
  if (cachedRonToEur && Date.now() - cachedRonToEur.fetchedAt < CACHE_TTL_MS) {
    return cachedRonToEur.rate;
  }
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=RON&symbols=EUR", {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      const rate = json?.rates?.EUR;
      if (typeof rate === "number" && rate > 0) {
        cachedRonToEur = { rate, fetchedAt: Date.now() };
        return rate;
      }
    }
  } catch (error) {
    console.error("Frankfurter API error, folosesc curs de rezerva:", error);
  }
  return FALLBACK_RON_TO_EUR;
}

export interface AnafFinancialData {
  cifraAfaceri: number | null;
  an: number | null;
  numeFirma: string | null;
  numarAngajati: number | null;
}

export interface AnafCompanyInfo {
  denumire: string | null;
  judet: string | null;
  oras: string | null;
}

function cleanCui(cui: string): string {
  return cui.replace(/^RO/i, "").replace(/\D/g, "");
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
 * Returneaza eroarea detaliata (status + raspuns brut) in loc sa o piarda
 * in console.error - userul nu are acces usor la Vercel Logs, asa ca
 * diagnosticul trebuie sa ajunga direct pe ecran.
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

export interface FinancialsResult {
  data: AnafFinancialData | null;
  error: string | null;
}

/**
 * Extrage cifra de afaceri / numar angajati din raspunsul Termene.ro.
 * Structura exacta nu e 100% confirmata pentru v2 - functia accepta mai
 * multe forme posibile (cele documentate oficial pentru v1, plus variante
 * plate), ca sa fie robusta indiferent de formatul exact intors de v2.
 */
export async function fetchAnafFinancials(cuiRaw: string): Promise<FinancialsResult> {
  const cui = cleanCui(cuiRaw);
  if (!cui) return { data: null, error: "CUI invalid." };

  const { data: json, error } = await callTermene(cui);
  if (error || !json) return { data: null, error };

  const dateGenerale = json["Date Generale"] as Record<string, unknown> | undefined;
  const bilanturi = json["Bilanturi"];

  if (dateGenerale || bilanturi) {
    const rows = Array.isArray(bilanturi)
      ? (bilanturi as Record<string, unknown>[])
      : bilanturi
        ? [bilanturi as Record<string, unknown>]
        : [];
    const sorted = [...rows].sort((a, b) => Number(b.an ?? 0) - Number(a.an ?? 0));
    const latest = sorted[0];

    const cifraAfaceriRon =
      (latest?.cifra_de_afaceri_neta as string | number | undefined) ??
      (dateGenerale?.cifra_de_afaceri_neta as string | number | undefined);
    const numarAngajati = latest?.numar_mediu_angajati as string | number | undefined;

    if (cifraAfaceriRon === undefined) {
      return {
        data: null,
        error: `Raspuns primit de la Termene.ro, dar fara cifra de afaceri recognoscibila. Raspuns brut: ${JSON.stringify(json).slice(0, 300)}`,
      };
    }

    const rate = await getRonToEurRate();
    return {
      data: {
        cifraAfaceri: Math.round(Number(cifraAfaceriRon) * rate),
        an: latest?.an ? Number(latest.an) : null,
        numeFirma: (dateGenerale?.nume as string) ?? null,
        numarAngajati: numarAngajati !== undefined ? Number(numarAngajati) : null,
      },
      error: null,
    };
  }

  const cifraAfaceriRon = json.cifra_de_afaceri_neta ?? json.cifraAfaceri ?? null;
  const numarAngajati = json.numar_mediu_angajati ?? json.numarAngajati ?? null;
  if (cifraAfaceriRon !== null) {
    const rate = await getRonToEurRate();
    return {
      data: {
        cifraAfaceri: Math.round(Number(cifraAfaceriRon) * rate),
        an: json.an ? Number(json.an) : null,
        numeFirma: (json.nume as string) ?? null,
        numarAngajati: numarAngajati !== null ? Number(numarAngajati) : null,
      },
      error: null,
    };
  }

  return {
    data: null,
    error: `Raspuns primit de la Termene.ro, dar structura e necunoscuta. Raspuns brut: ${JSON.stringify(json).slice(0, 300)}`,
  };
}

export async function fetchAnafCompanyInfo(cuiRaw: string): Promise<AnafCompanyInfo | null> {
  const cui = cleanCui(cuiRaw);
  if (!cui) return null;

  const { data: json } = await callTermene(cui);
  if (!json) return null;

  const dateGenerale = (json["Date Generale"] as Record<string, unknown> | undefined) ?? json;

  return {
    denumire: (dateGenerale.nume as string) ?? null,
    judet: (dateGenerale.judet as string) ?? null,
    oras: (dateGenerale.localitate as string) ?? null,
  };
}

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

  // Structura reala v2 (descoperita din raspuns live): { "firma": { ... } }.
  // Cautam cifra de afaceri si numarul de angajati in mai multe locatii
  // posibile in interiorul acestui obiect, plus variantele "vechi" (Date
  // Generale/Bilanturi, structura plata) ca fallback, ca sa fim robusti
  // la orice varianta reala.
  const firma = json["firma"] as Record<string, unknown> | undefined;
  const dateGenerale = json["Date Generale"] as Record<string, unknown> | undefined;
  const bilanturi = json["Bilanturi"];

  // Posibile chei pentru bilant/financiar in interiorul "firma" - Termene.ro
  // foloseste de obicei un array de bilanturi anuale sub o cheie ca
  // "bilant", "bilanturi" sau "financiar".
  const firmaBilantRaw =
    (firma?.["bilant"] as unknown) ??
    (firma?.["bilanturi"] as unknown) ??
    (firma?.["financiar"] as unknown) ??
    (firma?.["date_financiare"] as unknown);

  const candidateSources: Record<string, unknown>[] = [];
  if (Array.isArray(firmaBilantRaw)) candidateSources.push(...(firmaBilantRaw as Record<string, unknown>[]));
  else if (firmaBilantRaw && typeof firmaBilantRaw === "object")
    candidateSources.push(firmaBilantRaw as Record<string, unknown>);
  if (Array.isArray(bilanturi)) candidateSources.push(...(bilanturi as Record<string, unknown>[]));
  else if (bilanturi && typeof bilanturi === "object")
    candidateSources.push(bilanturi as Record<string, unknown>);
  if (dateGenerale) candidateSources.push(dateGenerale);
  if (firma) candidateSources.push(firma);
  candidateSources.push(json);

  const sorted = [...candidateSources].sort((a, b) => Number(b.an ?? 0) - Number(a.an ?? 0));

  const CA_KEYS = [
    "cifra_de_afaceri_neta",
    "cifra_afaceri",
    "cifraAfaceri",
    "cifra_de_afaceri",
    "venituri_totale",
    "venituri",
  ];
  const ANGAJATI_KEYS = [
    "numar_mediu_angajati",
    "numar_angajati",
    "numarAngajati",
    "nr_angajati",
    "angajati",
  ];

  function findFirst(source: Record<string, unknown>, keys: string[]): unknown {
    for (const k of keys) {
      if (source[k] !== undefined && source[k] !== null) return source[k];
    }
    return undefined;
  }

  let cifraAfaceriRon: unknown;
  let numarAngajati: unknown;
  let anGasit: unknown;
  for (const source of sorted) {
    if (cifraAfaceriRon === undefined) {
      const v = findFirst(source, CA_KEYS);
      if (v !== undefined) {
        cifraAfaceriRon = v;
        anGasit = source.an;
      }
    }
    if (numarAngajati === undefined) {
      const v = findFirst(source, ANGAJATI_KEYS);
      if (v !== undefined) numarAngajati = v;
    }
  }

  const numeFirma =
    (firma?.["nume_recom"] as string) ??
    (firma?.["nume_mfinante"] as string) ??
    (dateGenerale?.["nume"] as string) ??
    null;

  if (cifraAfaceriRon === undefined) {
    return {
      data: null,
      error: `Raspuns primit de la Termene.ro, dar fara cifra de afaceri recognoscibila. Raspuns brut: ${JSON.stringify(json)}`,
    };
  }

  const rate = await getRonToEurRate();
  return {
    data: {
      cifraAfaceri: Math.round(Number(cifraAfaceriRon) * rate),
      an: anGasit ? Number(anGasit) : null,
      numeFirma,
      numarAngajati: numarAngajati !== undefined ? Number(numarAngajati) : null,
    },
    error: null,
  };
}

export async function fetchAnafCompanyInfo(cuiRaw: string): Promise<AnafCompanyInfo | null> {
  const cui = cleanCui(cuiRaw);
  if (!cui) return null;

  const { data: json } = await callTermene(cui);
  if (!json) return null;

  const firma = json["firma"] as Record<string, unknown> | undefined;
  const dateGenerale = (json["Date Generale"] as Record<string, unknown> | undefined) ?? json;
  const adresa = firma?.["adresa"] as Record<string, unknown> | undefined;

  return {
    denumire:
      (firma?.["nume_recom"] as string) ??
      (firma?.["nume_mfinante"] as string) ??
      (dateGenerale.nume as string) ??
      null,
    judet: (adresa?.["judet"] as string) ?? (dateGenerale.judet as string) ?? null,
    oras:
      (adresa?.["localitate"] as string) ??
      (adresa?.["oras"] as string) ??
      (dateGenerale.localitate as string) ??
      null,
  };
}

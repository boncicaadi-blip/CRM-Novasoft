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

/**
 * Apeleaza Termene.ro v2 - POST cu Basic Auth, body JSON {cui, schemaKey}.
 * Credentialele vin din tabela api_credentials (editabile din /setari/integrari),
 * nu din variabile de mediu, ca sa poata fi schimbate fara redeploy.
 */
async function callTermene(cui: string): Promise<Record<string, unknown> | null> {
  const creds = await getTermeneCredentials();
  if (!creds.username || !creds.password || !creds.schemaKey) {
    console.error("Termene.ro: credentiale neconfigurate (vezi /setari/integrari).");
    return null;
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

    if (!res.ok) {
      console.error("Termene.ro API error:", res.status, await res.text());
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error("Termene.ro fetch error:", error);
    return null;
  }
}

/**
 * Extrage cifra de afaceri / numar angajati din raspunsul Termene.ro.
 * Structura exacta nu e 100% confirmata pentru v2 - functia accepta mai
 * multe forme posibile (cele documentate oficial pentru v1, plus variante
 * plate), ca sa fie robusta indiferent de formatul exact intors de v2.
 */
export async function fetchAnafFinancials(cuiRaw: string): Promise<AnafFinancialData | null> {
  const cui = cleanCui(cuiRaw);
  if (!cui) return null;

  const json = await callTermene(cui);
  if (!json) return null;

  // Varianta 1 (documentata oficial pt v1): { "Date Generale": {...}, "Bilanturi": {...} }
  const dateGenerale = json["Date Generale"] as Record<string, unknown> | undefined;
  const bilanturi = json["Bilanturi"];

  if (dateGenerale || bilanturi) {
    const rows = Array.isArray(bilanturi)
      ? (bilanturi as Record<string, unknown>[])
      : bilanturi
        ? [bilanturi as Record<string, unknown>]
        : [];
    const sorted = [...rows].sort(
      (a, b) => Number(b.an ?? 0) - Number(a.an ?? 0)
    );
    const latest = sorted[0];

    const cifraAfaceriRon =
      (latest?.cifra_de_afaceri_neta as string | number | undefined) ??
      (dateGenerale?.cifra_de_afaceri_neta as string | number | undefined);
    const numarAngajati = latest?.numar_mediu_angajati as string | number | undefined;

    const rate = await getRonToEurRate();

    return {
      cifraAfaceri: cifraAfaceriRon !== undefined ? Math.round(Number(cifraAfaceriRon) * rate) : null,
      an: latest?.an ? Number(latest.an) : null,
      numeFirma: (dateGenerale?.nume as string) ?? null,
      numarAngajati: numarAngajati !== undefined ? Number(numarAngajati) : null,
    };
  }

  // Varianta 2: structura plata directa pe radacina raspunsului.
  const cifraAfaceriRon = json.cifra_de_afaceri_neta ?? json.cifraAfaceri ?? null;
  const numarAngajati = json.numar_mediu_angajati ?? json.numarAngajati ?? null;
  if (cifraAfaceriRon !== null) {
    const rate = await getRonToEurRate();
    return {
      cifraAfaceri: Math.round(Number(cifraAfaceriRon) * rate),
      an: json.an ? Number(json.an) : null,
      numeFirma: (json.nume as string) ?? null,
      numarAngajati: numarAngajati !== null ? Number(numarAngajati) : null,
    };
  }

  return null;
}

export async function fetchAnafCompanyInfo(cuiRaw: string): Promise<AnafCompanyInfo | null> {
  const cui = cleanCui(cuiRaw);
  if (!cui) return null;

  const json = await callTermene(cui);
  if (!json) return null;

  const dateGenerale = (json["Date Generale"] as Record<string, unknown> | undefined) ?? json;

  return {
    denumire: (dateGenerale.nume as string) ?? null,
    judet: (dateGenerale.judet as string) ?? null,
    oras: (dateGenerale.localitate as string) ?? null,
  };
}

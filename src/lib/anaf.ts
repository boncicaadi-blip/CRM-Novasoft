/**
 * Integrare cu Termene.ro - API documentat oficial, necesita cont de membru
 * (user + parola), configurat prin variabilele de mediu TERMENE_USER si
 * TERMENE_PASSWORD. Documentatie: https://termene.ro/documentatie-api
 *
 * Nota despre autentificare: documentatia oficiala nu specifica explicit
 * formatul de transmitere a credentialelor (doar mentioneaza ca "sunt
 * necesare user si parola"). Implementarea de mai jos foloseste HTTP Basic
 * Auth (cel mai comun pentru API-uri GET simple ca acesta). Daca contul tau
 * Termene.ro arata un format diferit (ex. parametri user/pass in URL, sau
 * o cheie API separata), schimba doar functia `buildAuthHeaders` de mai jos.
 */

const TERMENE_API_URL = "https://termene.ro/api/dateFirmaSumar.php";

function buildAuthHeaders(): Record<string, string> {
  const user = process.env.TERMENE_USER;
  const pass = process.env.TERMENE_PASSWORD;
  if (!user || !pass) return {};
  const encoded = Buffer.from(`${user}:${pass}`).toString("base64");
  return { Authorization: `Basic ${encoded}` };
}

export interface AnafFinancialData {
  cifraAfaceri: number | null;
  an: number | null;
  numeFirma: string | null;
  numarAngajati: number | null;
}

function cleanCui(cui: string): string {
  return cui.replace(/^RO/i, "").replace(/\D/g, "");
}

interface TermeneBilantRow {
  an?: string;
  cifra_de_afaceri_neta?: string;
  numar_mediu_angajati?: string;
}

interface TermeneResponse {
  "Date Generale"?: {
    cui?: string;
    nume?: string;
    judet?: string;
    localitate?: string;
    cifra_de_afaceri_neta?: string;
  };
  Bilanturi?: TermeneBilantRow | TermeneBilantRow[];
}

export async function fetchAnafFinancials(cuiRaw: string): Promise<AnafFinancialData | null> {
  const cui = cleanCui(cuiRaw);
  if (!cui) return null;

  try {
    const res = await fetch(`${TERMENE_API_URL}?cui=${cui}&tip=0`, {
      headers: { Accept: "application/json", ...buildAuthHeaders() },
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("Termene.ro financials error:", res.status, await res.text());
      return null;
    }

    const json: TermeneResponse = await res.json();
    const numeFirma = json["Date Generale"]?.nume ?? null;

    const bilanturi = json.Bilanturi;
    if (!bilanturi) return numeFirma ? { cifraAfaceri: null, an: null, numeFirma, numarAngajati: null } : null;

    // Bilanturi poate fi un singur obiect sau un array (ani multipli) - luam cel mai recent.
    const rows = Array.isArray(bilanturi) ? bilanturi : [bilanturi];
    const sorted = [...rows].sort((a, b) => Number(b.an ?? 0) - Number(a.an ?? 0));
    const latest = sorted[0];
    if (!latest) return null;

    return {
      cifraAfaceri: latest.cifra_de_afaceri_neta ? Number(latest.cifra_de_afaceri_neta) : null,
      an: latest.an ? Number(latest.an) : null,
      numarAngajati: latest.numar_mediu_angajati ? Number(latest.numar_mediu_angajati) : null,
      numeFirma,
    };
  } catch (error) {
    console.error("fetchAnafFinancials error:", error);
    return null;
  }
}

export interface AnafCompanyInfo {
  denumire: string | null;
  judet: string | null;
  oras: string | null;
}

/** Date generale firma (nume, adresa) - folosit la auto-completare in formularul de creare. */
export async function fetchAnafCompanyInfo(cuiRaw: string): Promise<AnafCompanyInfo | null> {
  const cui = cleanCui(cuiRaw);
  if (!cui) return null;

  try {
    const res = await fetch(`${TERMENE_API_URL}?cui=${cui}&tip=0`, {
      headers: { Accept: "application/json", ...buildAuthHeaders() },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const json: TermeneResponse = await res.json();
    const dateGenerale = json["Date Generale"];
    if (!dateGenerale) return null;

    return {
      denumire: dateGenerale.nume ?? null,
      judet: dateGenerale.judet ?? null,
      oras: dateGenerale.localitate ?? null,
    };
  } catch (error) {
    console.error("fetchAnafCompanyInfo error:", error);
    return null;
  }
}

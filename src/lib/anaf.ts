/**
 * Integrare cu DemoANAF.ro - API REST public si gratuit (fara cheie, fara cont)
 * pentru date financiare ale firmelor romanesti, pe baza CUI.
 * Documentatie: https://demoanaf.ro/api-docs
 *
 * Nota: structura exacta a raspunsului poate varia usor; functia gestioneaza
 * defensiv campurile posibil absente, pentru robustete.
 */

export interface AnafFinancialData {
  cifraAfaceri: number | null;
  an: number | null;
  numeFirma: string | null;
}

function cleanCui(cui: string): string {
  return cui.replace(/^RO/i, "").replace(/\D/g, "");
}

export async function fetchAnafFinancials(cuiRaw: string): Promise<AnafFinancialData | null> {
  const cui = cleanCui(cuiRaw);
  if (!cui) return null;

  try {
    const res = await fetch(`https://demoanaf.ro/api/company/${cui}/financials`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const json = await res.json();
    if (!json?.success || !json?.data) return null;

    // Structura exacta poate fi un array de ani sau un obiect cu cheie "bilanturi"/"years" -
    // verificam cele mai probabile forme si luam cel mai recent an disponibil.
    const records: Array<Record<string, unknown>> = Array.isArray(json.data)
      ? json.data
      : Array.isArray(json.data?.bilanturi)
        ? json.data.bilanturi
        : Array.isArray(json.data?.years)
          ? json.data.years
          : [];

    if (records.length === 0) {
      // Poate fi un singur obiect cu cifra de afaceri direct.
      const ca = json.data?.cifraAfaceri ?? json.data?.cifra_afaceri ?? null;
      if (ca !== null) {
        return {
          cifraAfaceri: Number(ca),
          an: json.data?.an ?? json.data?.year ?? null,
          numeFirma: json.data?.denumire ?? null,
        };
      }
      return null;
    }

    // Sortam descrescator pe an si luam cel mai recent.
    const sorted = [...records].sort((a, b) => {
      const yearA = Number(a.an ?? a.year ?? 0);
      const yearB = Number(b.an ?? b.year ?? 0);
      return yearB - yearA;
    });
    const latest = sorted[0];
    const ca = latest.cifraAfaceri ?? latest.cifra_afaceri ?? latest.venituriTotale ?? null;

    return {
      cifraAfaceri: ca !== null ? Number(ca) : null,
      an: Number(latest.an ?? latest.year ?? null) || null,
      numeFirma: (json.data?.denumire as string) ?? null,
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
    const res = await fetch(`https://demoanaf.ro/api/company/${cui}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;

    const json = await res.json();
    if (!json?.success || !json?.data) return null;

    const data = json.data;
    return {
      denumire: data.denumire ?? data.name ?? null,
      judet: data.judet ?? data.county ?? null,
      oras: data.localitate ?? data.oras ?? data.city ?? null,
    };
  } catch (error) {
    console.error("fetchAnafCompanyInfo error:", error);
    return null;
  }
}

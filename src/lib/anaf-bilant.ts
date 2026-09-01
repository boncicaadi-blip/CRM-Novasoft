const BILANT_URL = (an: number, cui: string) => `https://webservicesp.anaf.ro/bilant?an=${an}&cui=${cui}`;

export interface BilantAnaf {
  an: number;
  cifraDeAfaceri: number | null;
  nrAngajati: number | null;
}

/**
 * Cauta bilantul ANAF (cifra de afaceri neta + numar mediu de salariati)
 * pentru un CUI, incepand cu cel mai recent an posibil si mergand inapoi -
 * util pentru ca nu stim dinainte care e ultimul an cu bilant depus (termen
 * legal: 31 mai anul urmator, deci un CUI poate sa nu aiba inca bilantul pe
 * anul cel mai recent incheiat).
 */
export async function fetchUltimulBilantAnaf(
  cui: string,
  aniDeIncercat = 4
): Promise<BilantAnaf | null> {
  const anCurent = new Date().getFullYear();
  const cuiCurat = cui.replace(/^RO/i, "").trim();

  for (let i = 1; i <= aniDeIncercat; i++) {
    const an = anCurent - i;
    try {
      const resp = await fetch(BILANT_URL(an, cuiCurat));
      if (!resp.ok) continue;
      const data = await resp.json();
      if (!data?.i || !Array.isArray(data.i) || data.i.length === 0) continue;

      const cifraAfaceri = data.i.find((x: { indicator: string }) => x.indicator === "I13")?.val_indicator ?? null;
      const nrAngajati = data.i.find((x: { indicator: string }) => x.indicator === "I20")?.val_indicator ?? null;

      if (cifraAfaceri === null && nrAngajati === null) continue;

      return { an, cifraDeAfaceri: cifraAfaceri, nrAngajati };
    } catch {
      continue;
    }
  }
  return null;
}

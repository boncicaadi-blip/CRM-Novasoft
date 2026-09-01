/**
 * Sarbatorile legale din Romania (Codul Muncii, art. 139 - Legea 53/2003).
 * Calculate direct, fara nicio sursa externa - datele fixe sunt hardcodate,
 * iar cele mobile (legate de Paste) se calculeaza cu algoritmul Pastelui
 * ortodox (valabil pentru intervalul 1900-2099).
 */

export interface SarbatoareLegala {
  data: string; // "YYYY-MM-DD"
  nume: string;
}

/** Data Pastelui ortodox (calendarul iulian, convertit la gregorian) pentru
 * un an dat. Algoritm Meeus (metoda iuliana), valabil 1900-2099. */
function pasteOrtodox(an: number): Date {
  const a = an % 4;
  const b = an % 7;
  const c = an % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const luna = Math.floor((d + e + 114) / 31); // 1-indexat: 3=martie, 4=aprilie
  const zi = ((d + e + 114) % 31) + 1;
  const dataIuliana = new Date(an, luna - 1, zi);
  // Iulian -> Gregorian: +13 zile (valabil 1900-2099)
  return new Date(dataIuliana.getTime() + 13 * 24 * 3600 * 1000);
}

function addZile(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 24 * 3600 * 1000);
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Toate sarbatorile legale pentru un an dat, cu denumire. */
export function getSarbatoriLegale(an: number): SarbatoareLegala[] {
  const paste = pasteOrtodox(an);
  const vinereaMare = addZile(paste, -2);
  const pasteLuni = addZile(paste, 1);
  const rusalii = addZile(paste, 49);
  const rusaliiLuni = addZile(paste, 50);

  return [
    { data: `${an}-01-01`, nume: "Anul Nou" },
    { data: `${an}-01-02`, nume: "Anul Nou (a doua zi)" },
    { data: `${an}-01-06`, nume: "Boboteaza" },
    { data: `${an}-01-07`, nume: "Sfantul Ioan Botezatorul" },
    { data: `${an}-01-24`, nume: "Ziua Unirii Principatelor Romane" },
    { data: toISO(vinereaMare), nume: "Vinerea Mare" },
    { data: toISO(paste), nume: "Paste" },
    { data: toISO(pasteLuni), nume: "A doua zi de Paste" },
    { data: `${an}-05-01`, nume: "Ziua Muncii" },
    { data: `${an}-06-01`, nume: "Ziua Copilului" },
    { data: toISO(rusalii), nume: "Rusalii" },
    { data: toISO(rusaliiLuni), nume: "A doua zi de Rusalii" },
    { data: `${an}-08-15`, nume: "Adormirea Maicii Domnului" },
    { data: `${an}-11-30`, nume: "Sfantul Andrei" },
    { data: `${an}-12-01`, nume: "Ziua Nationala a Romaniei" },
    { data: `${an}-12-25`, nume: "Craciunul" },
    { data: `${an}-12-26`, nume: "A doua zi de Craciun" },
  ].sort((a, b) => a.data.localeCompare(b.data));
}

/** Set rapid de date (YYYY-MM-DD) pentru verificare "e sarbatoare legala in
 * ziua asta?" - acopera automat si anul precedent/urmator, util pentru
 * intervale care trec peste Revelion. */
export function buildSarbatoriSet(ani: number[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const an of ani) {
    for (const s of getSarbatoriLegale(an)) map.set(s.data, s.nume);
  }
  return map;
}

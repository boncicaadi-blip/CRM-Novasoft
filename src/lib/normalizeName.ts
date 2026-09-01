/**
 * Normalizeaza un nume de firma pentru potrivire: majuscule, fara diacritice,
 * fara punctuatie (puncte, virgule, cratime), fara spatii multiple. Folosit
 * consistent oriunde trebuie decis daca doua texte diferite ("OST Transport
 * S.R.L." vs "OST TRANSPORT SRL" vs "Ost-Transport, SRL") se refera la
 * aceeasi firma.
 */
export function normalizeName(s: string): string {
  return s
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[.,]/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Un CIF real e format doar din cifre (eventual cu prefixul RO). Un Nr. Reg.
 * Com. arata ca "J40/1105/2011" - litera + bare oblice. Daca un asemenea
 * text ajunge intr-un camp de CIF (ex. dintr-o factura veche, XML citit
 * gresit inainte de fix), il respingem in loc sa-l acceptam ca CIF valid.
 */
export function looksLikeRegistryNumber(value: string): boolean {
  return /[A-Z]/i.test(value) || value.includes("/");
}

/** Curata si valideaza un CIF brut - intoarce null daca arata ca un Nr. Reg. Com., nu ca un CIF real. */
export function cleanAndValidateCif(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/^RO/i, "").trim();
  if (!cleaned) return null;
  if (looksLikeRegistryNumber(cleaned)) return null;
  return cleaned;
}

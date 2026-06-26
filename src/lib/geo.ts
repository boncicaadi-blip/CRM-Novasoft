/** Normalizeaza un nume de judet pentru matching, indiferent de diacritice/capitalizare. */
export function normalizeJudetName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

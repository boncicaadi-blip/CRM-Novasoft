// Formatare monetara centralizata - toate valorile din aplicatie sunt in EUR.

const fullFormatter = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat("ro-RO", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
});

const plainFormatter = new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 });

/** Ex: 12.500 € */
export function formatEur(value: number | null | undefined): string {
  if (!value) return "—";
  return fullFormatter.format(value);
}

/** Ex: 12,5 mii € — pentru spatii inguste (carduri Kanban, axe de grafic) */
export function formatEurCompact(value: number | null | undefined): string {
  if (!value) return "0 €";
  return compactFormatter.format(value);
}

/** Numar simplu, fara simbol monetar - util cand simbolul e separat in UI */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return plainFormatter.format(value);
}

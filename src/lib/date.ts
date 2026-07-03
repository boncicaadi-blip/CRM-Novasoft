/**
 * Data de "azi" (YYYY-MM-DD), ancorata la fusul orar Romaniei
 * (Europe/Bucharest), nu la fusul orar al mediului de executie.
 *
 * Fara asta, `new Date().toISOString().slice(0, 10)` pe un server rulat in
 * UTC (Vercel) sau `.toDateString()` intr-un browser cu ora Romaniei pot
 * produce date DIFERITE pentru "azi" - `toISOString()` converteste mereu
 * la UTC, deci miezul noptii ora Romaniei (UTC+2/+3) cade inca in ziua
 * precedenta in UTC. Rezultatul: popup-ul de rezumat zilnic (randat in
 * browser) putea arata o actiune din 2 iulie ca fiind "azi" (3 iulie),
 * pentru ca socotea "azi" dupa UTC, nu dupa ora Romaniei.
 *
 * Folosind Intl.DateTimeFormat cu timeZone explicit, rezultatul e identic
 * indiferent unde ruleaza codul (server sau browser).
 */
export function getTodayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date());
}

/** La fel ca getTodayISO, dar pentru o data oarecare (azi + N zile etc). */
export function toRomaniaISO(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(date);
}

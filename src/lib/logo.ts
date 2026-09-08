const LOGO_DEV_TOKEN = "pk_TaVjRTogTJyeq6p9rhTJXw";

/**
 * Extrage domeniul dintr-un website (accepta orice forma: cu/fara https://,
 * cu/fara www., cu/fara slash final) si construieste URL-ul logo-ului
 * companiei via Logo.dev. Cheia folosita e publica, gandita explicit pentru
 * a fi pusa direct intr-un <img src>, deci e sigur de expus in cod client.
 *
 * Returneaza null daca nu exista niciun website - in acel caz, UI-ul
 * afiseaza un fallback (initiale/iconita generica), nu incearca sa incarce
 * o imagine invalida.
 */
export function getCompanyLogoUrl(website: string | null | undefined, size = 64): string | null {
  if (!website) return null;

  const domeniu = website
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .split("?")[0];

  if (!domeniu || !domeniu.includes(".")) return null;

  return `https://img.logo.dev/${domeniu}?token=${LOGO_DEV_TOKEN}&size=${size}&format=png`;
}

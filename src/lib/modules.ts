export type ModuleKey = "crm" | "creante_obligatii" | "venituri_cheltuieli" | "management";

export const MODULE_LABELS: Record<ModuleKey, string> = {
  crm: "CRM",
  creante_obligatii: "Credit Control",
  venituri_cheltuieli: "Financiar",
  management: "Management",
};

export const ALL_MODULES: ModuleKey[] = ["crm", "creante_obligatii", "venituri_cheltuieli", "management"];

/** Submodule per modul - o cheie de acces partial (ex: doar Venituri, fara
 * Cheltuieli). Cheia completa folosita in profiles.submodule_access este
 * "{modul}.{submodul}", ex: "venituri_cheltuieli.venituri". Un modul care
 * nu apare aici (CRM, Management) nu are inca granularitate de submodul -
 * acces se da doar la nivel de modul intreg. */
export const SUBMODULES: Partial<Record<ModuleKey, { key: string; label: string }[]>> = {
  venituri_cheltuieli: [
    { key: "venituri", label: "Venituri" },
    { key: "venituri_dashboard", label: "Dashboard Venituri" },
    { key: "venituri_harta", label: "Harta Venituri" },
    { key: "cheltuieli", label: "Cheltuieli" },
    { key: "cheltuieli_dashboard", label: "Dashboard Cheltuieli" },
  ],
};

export function submoduleFullKey(module: ModuleKey, submodule: string): string {
  return `${module}.${submodule}`;
}

/**
 * Verifica accesul, tinand cont si de submodule. Adminii au mereu acces.
 * Daca userul are modulul INTREG in module_access, are acces la orice
 * submodul al lui automat. Altfel, verifica daca are exact submodulul cerut
 * in submodule_access. Daca nu se da niciun submodul, se verifica doar
 * modulul intreg (comportamentul de dinainte).
 */
export function hasAccess(
  isAdmin: boolean,
  moduleAccess: string[],
  submoduleAccess: string[],
  module: ModuleKey,
  submodule?: string
): boolean {
  if (isAdmin) return true;
  if (moduleAccess.includes(module)) return true;
  if (submodule && submoduleAccess.includes(submoduleFullKey(module, submodule))) return true;
  return false;
}

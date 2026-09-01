export type ModuleKey = "crm" | "creante_obligatii" | "venituri_cheltuieli" | "management" | "concedii" | "contracte";

export const MODULE_LABELS: Record<ModuleKey, string> = {
  crm: "CRM",
  creante_obligatii: "Credit Control",
  venituri_cheltuieli: "Financiar",
  management: "Management",
  concedii: "Concedii",
  contracte: "Contracte",
};

export const ALL_MODULES: ModuleKey[] = ["crm", "creante_obligatii", "venituri_cheltuieli", "management", "concedii", "contracte"];

/** Submodule per modul - o cheie de acces partial (ex: doar Venituri, fara
 * Cheltuieli). Cheia completa folosita in profiles.submodule_access este
 * "{modul}.{submodul}", ex: "venituri_cheltuieli.venituri". Un modul care
 * nu apare aici (CRM, Management) nu are inca granularitate de submodul -
 * acces se da doar la nivel de modul intreg. */
export const SUBMODULES: Partial<Record<ModuleKey, { key: string; label: string }[]>> = {
  crm: [
    { key: "pipeline", label: "Pipeline" },
    { key: "actiuni", label: "Actiuni" },
    { key: "calendar", label: "Calendar" },
    { key: "harta", label: "Harta" },
    { key: "dashboard", label: "Dashboard Comercial" },
    { key: "raport_comercial", label: "Raport Comercial" },
    { key: "raport_comercial_lunar", label: "Raport Comercial Lunar" },
    { key: "parteneri", label: "Parteneri" },
  ],
  creante_obligatii: [
    { key: "creante", label: "Creante" },
    { key: "creante_dashboard", label: "Dashboard Creante" },
    { key: "obligatii", label: "Obligatii" },
    { key: "obligatii_dashboard", label: "Dashboard Obligatii" },
  ],
  venituri_cheltuieli: [
    { key: "venituri", label: "Venituri" },
    { key: "venituri_dashboard", label: "Dashboard Venituri" },
    { key: "venituri_harta", label: "Harta Venituri" },
    { key: "cheltuieli", label: "Cheltuieli" },
    { key: "cheltuieli_dashboard", label: "Dashboard Cheltuieli" },
  ],
  management: [
    { key: "rapoarte_generale", label: "Rapoarte generale" },
    { key: "pl", label: "P&L detaliat" },
    { key: "cashflow", label: "Cashflow" },
  ],
  concedii: [
    { key: "calendar", label: "Calendar concedii" },
    { key: "cererile_mele", label: "Cererile mele" },
    { key: "aprobare", label: "Aprobare cereri" },
    { key: "angajati", label: "Registru angajati" },
    { key: "raport", label: "Raport Concedii" },
  ],
  contracte: [
    { key: "drafturi", label: "Draft-uri contracte" },
    { key: "generate", label: "Contracte generate" },
    { key: "registru", label: "Registru contracte" },
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

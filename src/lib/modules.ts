export type ModuleKey = "crm" | "creante_obligatii" | "venituri_cheltuieli";

export const MODULE_LABELS: Record<ModuleKey, string> = {
  crm: "CRM",
  creante_obligatii: "Creante & Obligatii",
  venituri_cheltuieli: "Venituri & Cheltuieli",
};

export const ALL_MODULES: ModuleKey[] = ["crm", "creante_obligatii", "venituri_cheltuieli"];

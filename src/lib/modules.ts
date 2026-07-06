export type ModuleKey = "crm" | "creante_obligatii" | "venituri_cheltuieli" | "management";

export const MODULE_LABELS: Record<ModuleKey, string> = {
  crm: "CRM",
  creante_obligatii: "Credit Control",
  venituri_cheltuieli: "Financiar",
  management: "Management",
};

export const ALL_MODULES: ModuleKey[] = ["crm", "creante_obligatii", "venituri_cheltuieli", "management"];

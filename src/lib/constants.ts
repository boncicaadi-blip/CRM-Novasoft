// Optiuni pentru campurile de tip lista, derivate din datele reale de pipeline.
// Le poti extinde oricand - sunt simple array-uri de string-uri, nu enum-uri rigide in DB.

export const STAGES = [
  "Lead Pool",
  "Suspect",
  "Calificare",
  "Programare prezentare",
  "Prezentare",
  "Ofertare",
  "Negociere",
  "Contractare",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_COLORS: Record<string, string> = {
  "Lead Pool": "#64748B",
  Suspect: "#94A3B8",
  Calificare: "#60A5FA",
  "Programare prezentare": "#38BDF8",
  Prezentare: "#22D3EE",
  Ofertare: "#FBBF24",
  Negociere: "#FB923C",
  Contractare: "#34D399",
};

export const STATUSES = ["Activa", "Castigata", "Pierduta", "Amanata"] as const;
export type StatusType = (typeof STATUSES)[number];

export const STATUS_COLORS: Record<string, string> = {
  Activa: "#3B82F6",
  Castigata: "#22C55E",
  Pierduta: "#EF4444",
  Amanata: "#F59E0B",
};

export const DOMENII_ACTIVITATE = [
  "TRM",
  "CE",
  "TRM+CE",
  "LOGISTICA",
  "SECURITATE",
  "PERSOANE",
] as const;

export const PRODUSE_SERVICII = [
  "SYNERGO",
  "ONE ERP",
  "PLANIFICATOR",
  "CONTABILITATE",
] as const;

export const TIPURI_PROIECT = [
  "TMS",
  "Contabilitate",
  "TMS + Contabilitate",
  "Power BI",
  "Web Clienti",
] as const;

export const CANALE_INTRARE = [
  "Direct",
  "Partener",
  "Recomandare",
  "Conferinte",
] as const;

export const STATUS_ACTIUNE = ["Planificata", "Finalizata"] as const;

export const ACTIUNI = [
  "Apel",
  "Calificare",
  "Follow-up",
  "Negociere",
  "Reactivare",
  "Stabilire intalnire",
  "Oferta",
  "Pregatire Demo",
  "Contractare",
  "Prezentare",
] as const;

export const DA_NU_NUSTIU = ["DA", "NU", "NU STIU"] as const;

export const JUDETE = [
  "Alba", "Arad", "Arges", "Bacau", "Bihor", "Bistrita-Nasaud", "Botosani",
  "Braila", "Brasov", "Bucuresti", "Buzau", "Calarasi", "Caras-Severin",
  "Cluj", "Constanta", "Covasna", "Dambovita", "Dolj", "Galati", "Giurgiu",
  "Gorj", "Harghita", "Hunedoara", "Ialomita", "Iasi", "Ilfov",
  "Maramures", "Mehedinti", "Mures", "Neamt", "Olt", "Prahova", "Salaj",
  "Satu Mare", "Sibiu", "Suceava", "Teleorman", "Timis", "Tulcea",
  "Valcea", "Vaslui", "Vrancea", "Vâlcea",
] as const;

// Mapare Status -> Substatusuri tipice (din datele reale), doar ca sugestii in UI
export const SUBSTATUS_SUGGESTIONS: Record<string, string[]> = {
  Pierduta: ["Nu raspunde", "Alta achizitie", "Buget"],
  Amanata: ["reofertat", "Revine in toamna", "Buget", "Buget & Solutie"],
  Activa: [
    "Client",
    "Stabilire intalnire",
    "Oferta transmisa",
    "Intocmire oferta",
    "Planificare intalnire",
    "De calificat",
    "Intalnire stabilita",
    "Necesar info",
    "Pregatire solutie",
    "Dosar fonduri",
    "Transmisa",
    "Prezentare operational",
    "Stabilit",
    "Creante",
  ],
  Castigata: ["Client"],
};

export const PROBABILITY_BY_STAGE: Record<string, number> = {
  "Lead Pool": 0.02,
  Suspect: 0.05,
  Calificare: 0.15,
  "Programare prezentare": 0.2,
  Prezentare: 0.3,
  Ofertare: 0.5,
  Negociere: 0.75,
  Contractare: 0.9,
};

// Etichete prietenoase pentru categoriile de nomenclator (afisate in pagina de administrare)
export const NOMENCLATOR_CATEGORII: { value: string; label: string; hasColor: boolean; hasProbability: boolean }[] = [
  { value: "stage", label: "Stage (etape pipeline)", hasColor: true, hasProbability: true },
  { value: "status", label: "Status", hasColor: true, hasProbability: false },
  { value: "domeniu_activitate", label: "Domeniul de activitate", hasColor: false, hasProbability: false },
  { value: "produs_serviciu", label: "Produs & Serviciu propus", hasColor: false, hasProbability: false },
  { value: "tip_proiect", label: "Tip proiect", hasColor: false, hasProbability: false },
  { value: "canal_intrare", label: "Canal intrare", hasColor: false, hasProbability: false },
  { value: "actiune", label: "Actiune (follow-up)", hasColor: false, hasProbability: false },
  { value: "status_actiune", label: "Status actiune", hasColor: false, hasProbability: false },
  { value: "motiv_pierdere", label: "Motiv pierdere", hasColor: false, hasProbability: false },
  { value: "motiv_amanare", label: "Motiv amanare", hasColor: false, hasProbability: false },
  { value: "venit_produs", label: "Venituri: Produs", hasColor: false, hasProbability: false },
  { value: "venit_serviciu", label: "Venituri: Serviciu", hasColor: false, hasProbability: false },
  { value: "modalitate_facturare", label: "Venituri: Modalitate facturare", hasColor: false, hasProbability: false },
  { value: "stadiu_contract", label: "Venituri: Stadiu contract", hasColor: false, hasProbability: false },
];

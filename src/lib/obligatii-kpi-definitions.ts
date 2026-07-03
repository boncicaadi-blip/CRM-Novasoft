import type { KpiDefinition } from "@/lib/kpi-definitions";

export const OBLIGATII_KPI_DEFINITIONS: Record<string, KpiDefinition> = {
  soldRestant: {
    descriere:
      "Suma soldurilor facturilor cu scadenta depasita. NU include facturile neplatite care inca nu au ajuns la scadenta (acelea sunt \"la zi\").",
    formula:
      "Suma (Total factura - Valoare platita), doar pentru facturi cu Sold > 0 si Data scadentei < azi",
    cumAnalizezi:
      "Calculat pe toate facturile din baza, indiferent de filtrul de perioada de mai jos - e o stare curenta, nu una filtrata istoric.",
  },
  facturiRestante: {
    descriere: "Numarul de facturi cu sold neplatit si scadenta depasita.",
    formula: "Numarare facturi cu Sold > 0 si Data scadentei < azi",
    cumAnalizezi:
      "La fel ca Soldul total restant, nu tine cont de filtrul de perioada - e mereu numarul real, curent.",
  },
  targetPropus: {
    descriere:
      "Suma valorilor propuse spre plata, pe facturile bifate \"Propus\". Daca n-ai modificat manual valoarea propusa pe o factura, se ia soldul ei integral.",
    formula: "Suma Valoare propusa (sau Sold, daca nu a fost editata), pentru facturile bifate",
    cumAnalizezi: "Cate facturi ai bifat si cat consideri realist ca platesti din ele.",
  },
  totalPlatit: {
    descriere: "Suma platilor inregistrate in jurnal, cu data platii in perioada selectata mai jos.",
    formula: "Suma valorilor din jurnalul de plati, filtrat dupa Data platii - NU dupa Data facturii",
    cumAnalizezi:
      "Spre deosebire de celelalte carduri, acesta chiar raspunde la filtrul de perioada.",
  },
};

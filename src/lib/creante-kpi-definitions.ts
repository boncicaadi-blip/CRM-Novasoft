import type { KpiDefinition } from "@/lib/kpi-definitions";

export const CREANTE_KPI_DEFINITIONS: Record<string, KpiDefinition> = {
  soldRestant: {
    descriere:
      "Suma soldurilor facturilor cu scadenta depasita. NU include facturile neincasate care inca nu au ajuns la scadenta (acelea sunt \"la zi\").",
    formula:
      "Suma (Total factura - Valoare incasata), doar pentru facturi cu Sold > 0 si Data scadentei < azi",
    cumAnalizezi:
      "Calculat pe toate facturile din baza, indiferent de filtrul de perioada de mai jos - e o stare curenta, nu una filtrata istoric. De-asta nu se schimba cand schimbi perioada.",
  },
  facturiRestante: {
    descriere: "Numarul de facturi cu sold neincasat si scadenta depasita.",
    formula: "Numarare facturi cu Sold > 0 si Data scadentei < azi",
    cumAnalizezi:
      "La fel ca Soldul total restant, nu tine cont de filtrul de perioada - e mereu numarul real, curent, indiferent ce ai selectat mai jos.",
  },
  targetPropus: {
    descriere:
      "Suma valorilor propuse spre incasare, pe facturile bifate \"Propus\". Daca n-ai modificat manual valoarea propusa pe o factura, se ia soldul ei integral.",
    formula: "Suma Valoare propusa (sau Sold, daca nu a fost editata), pentru facturile bifate",
    cumAnalizezi:
      "Cate facturi ai bifat si cat consideri realist ca incasezi din ele - targetul tau de lucru pentru perioada curenta.",
  },
  totalIncasat: {
    descriere: "Suma incasarilor inregistrate in jurnal, cu data incasarii in perioada selectata mai jos.",
    formula: "Suma valorilor din jurnalul de incasari, filtrat dupa Data incasarii - NU dupa Data facturii",
    cumAnalizezi:
      "Spre deosebire de celelalte carduri, acesta chiar raspunde la filtrul de perioada. O factura emisa in martie dar incasata in iunie conteaza la iunie, nu la martie.",
  },
};

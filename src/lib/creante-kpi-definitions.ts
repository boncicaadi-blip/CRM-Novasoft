import type { KpiDefinition } from "@/lib/kpi-definitions";

export const CREANTE_KPI_DEFINITIONS: Record<string, KpiDefinition> = {
  totalFacturat: {
    descriere: "Suma totala a tuturor facturilor emise catre acest client, indiferent daca sunt incasate sau nu.",
    formula: "Suma Total factura, pentru toate facturile clientului",
    cumAnalizezi: "Volumul total de business facturat pana acum catre acest client.",
  },
  ziuaLunii: {
    descriere: "Suma incasarilor, agregata pe ziua din luna (1-31), pe toata perioada selectata sus - indiferent de an sau luna calendaristica.",
    formula: "Suma Valoare incasare, grupata dupa ziua din data incasarii",
    cumAnalizezi: "In ce zile din luna intra de obicei banii de la clienti - util pentru a-ti planifica propriile plati in jurul acestor date.",
  },
  totalNeincasat: {
    descriere:
      "Suma soldurilor TUTUROR facturilor neincasate, indiferent daca scadenta e deja depasita sau nu - include atat facturile restante, cat si cele inca la zi.",
    formula: "Suma (Total factura - Valoare incasata), pentru toate facturile cu Sold > 0",
    cumAnalizezi:
      "Cat ai in total de incasat de la clienti, la data curenta - o privire mai larga decat doar soldul restant (care exclude facturile inca la zi).",
  },
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
  dso: {
    descriere: "Days Sales Outstanding - numarul mediu de zile pana se incaseaza o factura, dupa emitere.",
    formula: "(Sold neincasat curent / Total facturat in ultimele 90 de zile) x 90 de zile",
    cumAnalizezi:
      "Un DSO care creste in timp arata ca incasezi mai greu decat inainte - clientii platesc mai tarziu. Nu raspunde la filtrul de perioada de sus (e mereu calculat pe ultimele 90 de zile, ca sa fie comparabil de la o luna la alta).",
  },
  statusChart: {
    descriere: "Cate facturi (si cat sold) sunt in fiecare status: La zi, Restanta sau Incasata.",
    formula: "Numarare + suma sold, grupate dupa status curent al fiecarei facturi",
    cumAnalizezi: "Click pe o felie filtreaza restul dashboard-ului la doar acel status.",
  },
  tipVanzareChart: {
    descriere: "Cum se imparte soldul restant intre facturi Recurente si Nerecurente.",
    formula: "Suma sold, grupata dupa campul Tip Vanzare",
    cumAnalizezi:
      "Util ca sa vezi daca restantele vin mai mult din contracte recurente (abonamente) sau din proiecte punctuale.",
  },
  agingChart: {
    descriere: "Cum se distribuie soldul restant pe intervale de vechime a intarzierii.",
    formula: "Suma sold pentru facturi restante, grupata pe intervale de zile depasire scadenta",
    cumAnalizezi:
      "Bara 90+ mare inseamna bani vechi, greu de recuperat - de obicei acolo trebuie concentrat efortul de recuperare.",
  },
  grtCard: {
    descriere:
      "Grad Realizare Target - cat din suma propusa spre incasare luna asta chiar s-a incasat pana acum.",
    formula: "Incasat in luna curenta / Target lunii curente x 100",
    cumAnalizezi:
      "Targetul se calculeaza automat din facturile bifate 'Propus spre incasare' - nu se seteaza manual.",
  },
  grtChart: {
    descriere: "Evolutia targetului si a incasarilor, luna de luna, plus procentul de realizare.",
    formula: "Bare: target si incasat per luna. Linie: Incasat / Target x 100",
    cumAnalizezi:
      "Incasatul se recalculeaza mereu live din jurnal - daca anulezi o incasare pe o luna trecuta, graficul se actualizeaza automat.",
  },
  dinamicaChart: {
    descriere: "Cat s-a emis nou in fiecare luna (facturat) fata de cat s-a incasat efectiv.",
    formula: "Facturat: suma Total factura dupa Data facturii. Incasat: suma din jurnal dupa Data incasarii",
    cumAnalizezi:
      "Daca liniile se departeaza in timp (facturat mult mai mare decat incasat), soldul restant creste constant.",
  },
  incasariTimeSeriesChart: {
    descriere: "Evolutia lunara a sumelor efectiv incasate, din jurnalul de incasari.",
    formula: "Suma valorilor din jurnal, grupata dupa luna Datei incasarii",
    cumAnalizezi: "Arata ritmul real de incasare, indiferent cand au fost emise facturile respective.",
  },
  topClientiChart: {
    descriere: "Clientii cu cel mai mare sold restant chiar acum (doar facturi restante).",
    formula: "Suma sold pentru facturi restante, grupata pe firma, top 8 dupa valoare",
    cumAnalizezi: "Click pe o bara filtreaza restul dashboard-ului la acel client.",
  },
  riscZone: {
    descriere: "Facturile cele mai importante de urmarit - combina sold mare cu vechime mare.",
    formula: "Sortare dupa Sold x Zile depasire, descrescator - nu doar sold, nu doar vechime, ci produsul lor",
    cumAnalizezi:
      "O factura mica dar foarte veche, sau una mare dar recenta, nu urca la fel de sus ca una mare SI veche.",
  },
};

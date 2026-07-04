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
  statusChart: {
    descriere: "Cate facturi (si cat sold) sunt in fiecare status: La zi, Restanta sau Platita.",
    formula: "Numarare + suma sold, grupate dupa status curent al fiecarei facturi",
    cumAnalizezi: "Click pe o felie filtreaza restul dashboard-ului la doar acel status.",
  },
  tipAchizitieChart: {
    descriere: "Cum se imparte soldul restant intre facturi Recurente si Nerecurente.",
    formula: "Suma sold, grupata dupa campul Tip Achizitie",
    cumAnalizezi:
      "Util ca sa vezi daca restantele vin mai mult din contracte recurente (abonamente) sau din achizitii punctuale.",
  },
  agingChart: {
    descriere: "Cum se distribuie soldul restant pe intervale de vechime a intarzierii.",
    formula: "Suma sold pentru facturi restante, grupata pe intervale de zile depasire scadenta",
    cumAnalizezi:
      "Bara 90+ mare inseamna datorii vechi - de obicei acolo trebuie prioritizata plata.",
  },
  grtCard: {
    descriere:
      "Grad Realizare Target - cat din suma propusa spre plata luna asta chiar s-a platit pana acum.",
    formula: "Platit in luna curenta / Target lunii curente x 100",
    cumAnalizezi:
      "Targetul se calculeaza automat din facturile bifate 'Propus spre plata' - nu se seteaza manual.",
  },
  grtChart: {
    descriere: "Evolutia targetului si a platilor, luna de luna, plus procentul de realizare.",
    formula: "Bare: target si platit per luna. Linie: Platit / Target x 100",
    cumAnalizezi:
      "Platitul se recalculeaza mereu live din jurnal - daca anulezi o plata pe o luna trecuta, graficul se actualizeaza automat.",
  },
  dinamicaChart: {
    descriere: "Cat s-a primit nou in fiecare luna (facturat) fata de cat s-a platit efectiv.",
    formula: "Facturat: suma Total factura dupa Data facturii. Platit: suma din jurnal dupa Data platii",
    cumAnalizezi:
      "Daca liniile se departeaza in timp (facturat mult mai mare decat platit), soldul restant creste constant.",
  },
  platiTimeSeriesChart: {
    descriere: "Evolutia lunara a sumelor efectiv platite, din jurnalul de plati.",
    formula: "Suma valorilor din jurnal, grupata dupa luna Datei platii",
    cumAnalizezi: "Arata ritmul real de plata, indiferent cand au fost primite facturile respective.",
  },
  topFurnizoriChart: {
    descriere: "Furnizorii cu cel mai mare sold restant chiar acum (doar facturi restante).",
    formula: "Suma sold pentru facturi restante, grupata pe furnizor, top 8 dupa valoare",
    cumAnalizezi: "Click pe o bara filtreaza restul dashboard-ului la acel furnizor.",
  },
  riscZone: {
    descriere: "Facturile cele mai importante de urmarit - combina sold mare cu vechime mare.",
    formula: "Sortare dupa Sold x Zile depasire, descrescator",
    cumAnalizezi:
      "O factura mica dar foarte veche, sau una mare dar recenta, nu urca la fel de sus ca una mare SI veche.",
  },
};

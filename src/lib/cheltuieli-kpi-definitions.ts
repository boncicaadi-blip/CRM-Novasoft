import type { KpiDefinition } from "@/lib/kpi-definitions";

export const CHELTUIELI_KPI_DEFINITIONS: Record<string, KpiDefinition> = {
  prognozat: {
    descriere: "Suma bugetata (prognozata) pentru toate liniile de cheltuiala din perioada selectata, inclusiv lunile viitoare deja planificate din contracte recurente.",
    formula: "Suma Valoare Prognozata, pentru toate liniile din perioada filtrata",
    cumAnalizezi: "Cat cheltuiala e planificata, indiferent daca s-a si intamplat inca sau nu.",
  },
  realizat: {
    descriere: "Suma efectiv platita, asa cum ai editat-o manual pe fiecare linie.",
    formula: "Suma Valoare Realizata, pentru toate liniile din perioada filtrata",
    cumAnalizezi: "Cat s-a platit cu adevarat, din tot ce era planificat.",
  },
  diferentaYtd: {
    descriere: "Diferenta intre realizat si prognozat, calculata DOAR pana in luna curenta inclusiv - lunile viitoare, inca neintamplate, nu sunt numarate.",
    formula: "Valoare Realizata - Valoare Prognozata (doar luni <= luna curenta)",
    cumAnalizezi: "O diferenta pozitiva (verde) inseamna ca ai cheltuit mai putin decat era bugetat pana acum - de obicei un lucru bun.",
  },
  evolutiePrognozatRealizat: {
    descriere: "Traiectoria lunara a bugetului de cheltuieli comparat cu ce s-a platit efectiv.",
    cumAnalizezi: "Arata daca cheltuielile reale se abat sistematic de la buget, in plus sau in minus.",
  },
  dupaIncadrare: {
    descriere: "Cheltuiala realizata grupata pe Incadrare (SALARII, SPATIU, INFRASTRUCTURA IT etc).",
    cumAnalizezi: "Care categorie mare consuma cel mai mult din buget.",
  },
  dupaClasa: {
    descriere: "Cheltuiala realizata grupata pe Clasa cheltuielii (Salarii nete, Chirie, Utilitati etc).",
    cumAnalizezi: "O detaliere mai fina decat Incadrarea, utila pentru a gasi exact ce anume creste.",
  },
  fixeVsVariabile: {
    descriere: "Ponderea cheltuielilor Recurente (aceeasi cheltuiala, luna de luna) fata de cele Nerecurente (punctuale).",
    cumAnalizezi: "Un procent mare de cheltuieli recurente inseamna costuri fixe previzibile, dar si mai putina flexibilitate daca veniturile scad.",
  },
  dupaStatusContract: {
    descriere: "Cheltuiala realizata grupata dupa statusul contractului care a generat-o (Activ/Inactiv), sau 'Fara contract' pentru liniile manuale.",
    cumAnalizezi: "Cat din cheltuiala vine din contracte inca active, versus contracte deja incheiate.",
  },
};

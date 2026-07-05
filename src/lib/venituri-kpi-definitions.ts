import type { KpiDefinition } from "@/lib/kpi-definitions";

export const VENITURI_KPI_DEFINITIONS: Record<string, KpiDefinition> = {
  venitEstimat: {
    descriere: "Suma bugetata (estimata) pentru toate liniile de venit din perioada selectata, inclusiv lunile viitoare deja planificate din contracte.",
    formula: "Suma Venit Estimat, pentru toate liniile din perioada filtrata",
    cumAnalizezi: "Cat venit e planificat, indiferent daca s-a si intamplat inca sau nu.",
  },
  venitRealizat: {
    descriere: "Suma efectiv incasata/facturata, asa cum ai editat-o manual pe fiecare linie.",
    formula: "Suma Venit Realizat, pentru toate liniile din perioada filtrata",
    cumAnalizezi: "Cat s-a intamplat cu adevarat, din tot ce era planificat.",
  },
  diferentaYtd: {
    descriere: "Diferenta intre realizat si estimat, calculata DOAR pana in luna curenta inclusiv - lunile viitoare, inca neintamplate, nu sunt numarate ca 'ratate'.",
    formula: "Venit Realizat - Venit Estimat (doar luni <= luna curenta)",
    cumAnalizezi: "O diferenta negativa mare aici chiar inseamna ca ai incasat mai putin decat era planificat pana acum - nu e un artefact al lunilor viitoare.",
  },
  gradRealizare: {
    descriere: "Cat la suta din bugetul de pana acum (YTD) s-a realizat efectiv.",
    formula: "Venit Realizat / Venit Estimat (doar luni <= luna curenta) x 100",
    cumAnalizezi: "Sub 100% inseamna ca esti in urma fata de plan; peste 100% inseamna ca ai depasit estimarea.",
  },
  evolutieEstimatRealizat: {
    descriere: "Traiectoria lunara a bugetului estimat comparat cu ce s-a realizat efectiv, pe ultimele 18 luni.",
    cumAnalizezi: "Arata daca decalajul dintre plan si realitate creste sau se micsoreaza in timp.",
  },
  dupaProdus: {
    descriere: "Cum se imparte venitul realizat intre produsele urmarite (SYNERGO, SAF-T, E-FACTURA etc).",
    cumAnalizezi: "Care produs aduce cel mai mult venit real, nu doar cel mai mult planificat.",
  },
  dupaServiciu: {
    descriere: "Cum se imparte venitul realizat intre tipurile de serviciu (Mentenanta, Suport Tehnic, Implementare etc).",
    cumAnalizezi: "Ce fel de munca genereaza cel mai mult venit efectiv.",
  },
  recurentVsNerecurent: {
    descriere: "Ponderea venitului realizat care vine din contracte recurente (abonamente) fata de vanzari punctuale.",
    cumAnalizezi: "Un procent mare de venit recurent inseamna venit mai predictibil pe termen lung.",
  },
  dupaStatusContract: {
    descriere: "Venitul realizat grupat dupa statusul contractului care l-a generat (Activ/Inactiv), sau 'Fara contract' pentru liniile manuale.",
    cumAnalizezi: "Cat din venitul tau vine din contracte inca active, versus din contracte deja inactive sau vanzari punctuale.",
  },
  topClienti: {
    descriere: "Cei mai mari 10 clienti dupa venit realizat, in perioada selectata.",
    cumAnalizezi: "Un client foarte mare in top poate insemna dependenta de concentrare - risc daca acel client pleaca.",
  },
  dupaGrup: {
    descriere: "Venitul realizat grupat pe Grupul de firme din care face parte fiecare client (din fisa oportunitatii) - util cand acelasi grup are mai multe firme/contracte separate.",
    cumAnalizezi: "Vezi valoarea reala a unui grup de firme, nu doar a unei singure entitati legale din grup.",
  },
};

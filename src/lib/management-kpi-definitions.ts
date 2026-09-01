import type { KpiDefinition } from "@/lib/kpi-definitions";

export const MANAGEMENT_KPI_DEFINITIONS: Record<string, KpiDefinition> = {
  comparatiePerioade: {
    descriere: "MTD (luna curenta pana acum), YTD (anul curent pana acum), MoM (variatie fata de luna anterioara) si YoY (variatie fata de aceeasi luna, anul trecut) - calculate mereu pe luna/anul curent, indiferent de perioada selectata mai sus in pagina.",
    formula: "MTD/YTD: suma valorilor realizate. MoM/YoY: (curent - anterior) / |anterior|",
    cumAnalizezi: "Verde = evolutie buna (venituri/profit in crestere, sau cheltuieli in scadere). Rosu = evolutie nefavorabila.",
  },
  comparatieMultiAn: {
    descriere: "Compara liber orice combinatie de ani si luni/trimestre - nu doar luna/anul curent ca la MTD/YTD/MoM/YoY de mai sus.",
    formula: "Suma venit realizat, pentru fiecare an selectat, restransa optional doar la lunile/trimestrele bifate.",
    cumAnalizezi: "Util pentru intrebari libere: cum arata Q1 din fiecare an, unul langa altul? Cum a evoluat luna august, de-a lungul anilor?",
  },
  venitRealizat: {
    descriere: "Suma venitului realizat, din modulul Venituri, pe perioada selectata.",
    cumAnalizezi: "Baza de calcul pentru profit si productivitate.",
  },
  cheltuieliRealizate: {
    descriere: "Suma cheltuielilor realizate, din modulul Cheltuieli, pe perioada selectata.",
    cumAnalizezi: "Baza de calcul pentru profit si cost per angajat.",
  },
  profitNet: {
    descriere: "Venit realizat minus Cheltuieli realizate - varianta simplificata, fara ajustari fiscale separate.",
    formula: "Venit Realizat - Cheltuieli Realizate",
    cumAnalizezi: "Rezultatul operational real al perioadei.",
  },
  profitBrut: {
    descriere: "In acest raport simplificat, identic cu Profit NET - nu exista inca o distinctie separata (ex. inainte de taxe). Poate fi rafinat ulterior.",
    formula: "Venit Realizat - Cheltuieli Realizate",
    cumAnalizezi: "Aceeasi cifra ca Profit NET, pana cand se defineste o formula distincta.",
  },
  productivitateAngajat: {
    descriere: "Venitul realizat, impartit la numarul de angajati din acea luna.",
    formula: "Venit Realizat (luna) / Nr Angajati (luna)",
    cumAnalizezi: "Cat venit genereaza, in medie, un angajat - un trend descendent sustinut merita investigat.",
  },
  costPerAngajat: {
    descriere: "Cheltuielile realizate ale companiei, impartite la numarul de angajati din acea luna (nu doar salariile).",
    formula: "Cheltuieli Realizate (luna) / Nr Angajati (luna)",
    cumAnalizezi: "Costul total mediu per angajat, incluzand toate cheltuielile companiei, nu doar salariale.",
  },
  ponderesVenitRecurent: {
    descriere: "Cat la suta din venitul realizat vine din contracte recurente (abonamente), nu din vanzari punctuale.",
    formula: "Venit Recurent Realizat / Venit Total Realizat x 100",
    cumAnalizezi: "Un procent mare inseamna venit mai predictibil pe termen lung.",
  },
};

import type { Angajat, ConcediuCerere, ConcediuSold } from "@/types/concedii";
import { getSarbatoriLegale, buildSarbatoriSet } from "@/lib/sarbatori-legale";

export interface SoldAngajat {
  angajat_id: string;
  an: number;
  zileAlocate: number;
  zileFolosite: number;
  zileRamase: number;
}

/** Zilele folosite se calculeaza direct din cererile aprobate de tip
 * "concediu_odihna" (nu si CM/eveniment special) - nu se stocheaza separat,
 * ca sa nu se poata desincroniza de realitate. */
export function computeSolduri(
  angajati: Angajat[],
  cereri: ConcediuCerere[],
  solduriAlocate: ConcediuSold[],
  an: number
): SoldAngajat[] {
  const alocateMap = new Map(solduriAlocate.filter((s) => s.an === an).map((s) => [s.angajat_id, s.zile_alocate]));

  return angajati.map((a) => {
    const zileFolosite = cereri
      .filter(
        (c) =>
          c.angajat_id === a.id &&
          c.tip === "concediu_odihna" &&
          c.status === "aprobat" &&
          c.data_inceput.slice(0, 4) === String(an)
      )
      .reduce((s, c) => s + c.nr_zile, 0);

    const zileAlocate = alocateMap.get(a.id) ?? 21;
    return { angajat_id: a.id, an, zileAlocate, zileFolosite, zileRamase: zileAlocate - zileFolosite };
  });
}

export interface ZiCalendar {
  data: string; // YYYY-MM-DD
  esteWeekend: boolean;
  sarbatoare: string | null;
}

/** Genereaza toate zilele unei luni date, cu weekend/sarbatoare marcate -
 * baza pentru randarea grilei calendarului. */
export function buildZileLuna(an: number, luna: number): ZiCalendar[] {
  const sarbatori = new Map(getSarbatoriLegale(an).map((s) => [s.data, s.nume]));
  const nrZile = new Date(an, luna, 0).getDate();
  const zile: ZiCalendar[] = [];
  for (let zi = 1; zi <= nrZile; zi++) {
    const d = new Date(an, luna - 1, zi);
    const dataStr = `${an}-${String(luna).padStart(2, "0")}-${String(zi).padStart(2, "0")}`;
    const ziuaSaptamana = d.getDay(); // 0=duminica, 6=sambata
    zile.push({
      data: dataStr,
      esteWeekend: ziuaSaptamana === 0 || ziuaSaptamana === 6,
      sarbatoare: sarbatori.get(dataStr) ?? null,
    });
  }
  return zile;
}

/** Pentru un angajat si o zi data, cererea de concediu activa in acea zi
 * (daca exista), sau null. */
export function gasesteConcediuInZi(
  cereri: ConcediuCerere[],
  angajatId: string,
  data: string
): ConcediuCerere | null {
  return (
    cereri.find(
      (c) => c.angajat_id === angajatId && c.status === "aprobat" && data >= c.data_inceput && data <= c.data_sfarsit
    ) ?? null
  );
}

export interface SoldCascadat {
  an: number;
  zileAlocate: number;
  zileFolosite: number;
  zileReportate: number; // reportat din anul anterior (deja include cascada anilor de dinainte)
  zileRamase: number; // alocate + reportate - folosite (ce se reporteaza mai departe, daca e pozitiv)
}

/**
 * Soldul corect, in cascada, pentru un angajat - reportatul dintr-un an nu
 * e doar "alocat - folosit" pentru anul respectiv, ci include si ce s-a
 * reportat DIN anul de dinainte, si tot asa, in lant, de la primul an cu
 * date. Fara asta, "reportate in anul N+1" nu corespunde cu "ramase in anul
 * N" afisat separat (exact discrepanta observata).
 */
export function computeSoldCascadat(
  angajat: Angajat,
  cereri: ConcediuCerere[],
  solduriAlocate: ConcediuSold[],
  anTinta: number,
  anInceput: number
): SoldCascadat {
  let reportatAnterior = 0;
  let rezultat: SoldCascadat = { an: anInceput, zileAlocate: 0, zileFolosite: 0, zileReportate: 0, zileRamase: 0 };

  for (let an = anInceput; an <= anTinta; an++) {
    // Suprascrierea manuala (concedii_sold) are prioritate, daca exista
    // pentru anul respectiv; altfel, se calculeaza automat, proratat dupa
    // data angajarii/incetarii daca cade in acest an.
    const overrideManual = solduriAlocate.find((s) => s.angajat_id === angajat.id && s.an === an)?.zile_alocate;
    const alocat = overrideManual ?? calculeazaZileAlocateProratat(angajat, an);
    const folosit = cereri
      .filter(
        (c) =>
          c.angajat_id === angajat.id &&
          c.tip === "concediu_odihna" &&
          c.status === "aprobat" &&
          c.data_inceput.slice(0, 4) === String(an)
      )
      .reduce((s, c) => s + c.nr_zile, 0);
    const ramas = alocat + reportatAnterior - folosit;
    rezultat = { an, zileAlocate: alocat, zileFolosite: folosit, zileReportate: reportatAnterior, zileRamase: ramas };
    reportatAnterior = Math.max(0, ramas);
  }

  return rezultat;
}

/** Primul an cu vreo urma de activitate (cereri sau sold alocat explicit) -
 * baza de pornire pentru cascada, ca sa nu inceapa arbitrar dintr-un an
 * gresit. */
/**
 * Contorizarea oficiala a zilelor de concediu (cu reportare de la un an la
 * altul) a inceput in 2024 - orice e din 2023 sau mai devreme ramane
 * vizibil in istoric, dar NU se reporteaza mai departe in 2024+. Schimba
 * aici daca politica se schimba vreodata.
 */
export const ANUL_INCEPUT_REPORTARE = 2024;

export function primulAnCuDate(cereri: ConcediuCerere[], solduri: ConcediuSold[]): number {
  const ani = [
    ...cereri.map((c) => Number(c.data_inceput.slice(0, 4))),
    ...solduri.map((s) => s.an),
  ];
  const primulAnCuActivitate = ani.length === 0 ? new Date().getFullYear() : Math.min(...ani);
  return Math.max(primulAnCuActivitate, ANUL_INCEPUT_REPORTARE);
}

/**
 * Cate zile de concediu ii revin unui angajat pentru un an anume,
 * proratat dupa data angajarii/incetarii (daca angajarea/incetarea cade in
 * anul respectiv). Regula: o luna conteaza intreaga daca angajatul a lucrat
 * in ea MAI MULT de jumatate din luna - concret, angajare inainte de 15 =
 * luna conteaza; incetare de la 15 incolo = luna conteaza. Returneaza 0
 * daca anul e complet in afara perioadei de angajare (nu se aplica deloc).
 */
export function calculeazaZileAlocateProratat(angajat: Angajat, an: number): number {
  const bazaAnuala = angajat.zile_alocate_an ?? 21;
  const dataAngajare = angajat.data_angajare ? new Date(angajat.data_angajare) : null;
  const dataIncetare = angajat.data_incetare ? new Date(angajat.data_incetare) : null;

  if (dataAngajare && dataAngajare.getFullYear() > an) return 0;
  if (dataIncetare && dataIncetare.getFullYear() < an) return 0;

  let lunaStart = 1;
  let lunaEnd = 12;

  if (dataAngajare && dataAngajare.getFullYear() === an) {
    lunaStart = dataAngajare.getMonth() + 1;
    if (dataAngajare.getDate() >= 15) lunaStart += 1;
  }
  if (dataIncetare && dataIncetare.getFullYear() === an) {
    lunaEnd = dataIncetare.getMonth() + 1;
    if (dataIncetare.getDate() < 15) lunaEnd -= 1;
  }

  const luniLucrate = Math.max(0, Math.min(12, lunaEnd - lunaStart + 1));
  if (luniLucrate <= 0) return 0;
  if (luniLucrate >= 12) return bazaAnuala;
  return Math.round((bazaAnuala * luniLucrate) / 12);
}

/** True daca angajatul a fost prezent (macar o luna) in anul respectiv -
 * baza pentru a decide daca apare in rapoartele istorice pentru acel an
 * (respecta data angajarii si data incetarii). */
export function esteRelevantInAnul(angajat: Angajat, an: number): boolean {
  const dataAngajare = angajat.data_angajare ? new Date(angajat.data_angajare) : null;
  const dataIncetare = angajat.data_incetare ? new Date(angajat.data_incetare) : null;
  if (dataAngajare && dataAngajare.getFullYear() > an) return false;
  if (dataIncetare && dataIncetare.getFullYear() < an) return false;
  return true;
}

/**
 * Numarul de zile LUCRATOARE dintr-un interval calendaristic (inclusiv
 * ambele capete) - exclude automat weekendurile si sarbatorile legale.
 * Asta e ce se scade efectiv din soldul de concediu, nu numarul brut de
 * zile calendaristice ale intervalului.
 */
export function calculeazaZileLucratoare(dataInceput: string, dataSfarsit: string): number {
  const start = new Date(dataInceput);
  const end = new Date(dataSfarsit);
  if (end < start) return 0;

  const aniImplicati = new Set<number>();
  for (let y = start.getFullYear(); y <= end.getFullYear(); y++) aniImplicati.add(y);
  const sarbatori = buildSarbatoriSet(Array.from(aniImplicati));

  let zileLucratoare = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    const ziuaSaptamana = cursor.getDay(); // 0=duminica, 6=sambata
    const dataStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;
    if (ziuaSaptamana !== 0 && ziuaSaptamana !== 6 && !sarbatori.has(dataStr)) {
      zileLucratoare += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return zileLucratoare;
}

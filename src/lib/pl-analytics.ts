import type { VenitLinie } from "@/types/venituri";
import type { CheltuialaLinie } from "@/types/cheltuieli";

export interface PlMonthKey {
  luna: string; // "2026-07"
  label: string; // "iul. 26"
}

export interface PlValoare {
  estimat: number;
  realizat: number;
}

export interface PlLinieValoare {
  clasa: string;
  perLuna: Record<string, PlValoare>;
  totalEstimat: number;
  totalRealizat: number;
}

export interface PlGrupValoare {
  incadrare: string;
  linii: PlLinieValoare[];
  perLuna: Record<string, PlValoare>;
  totalEstimat: number;
  totalRealizat: number;
}

export interface PlReport {
  luni: PlMonthKey[];
  venituri: PlGrupValoare;
  costuriGrupe: PlGrupValoare[];
  totalVenituri: { perLuna: Record<string, PlValoare>; totalEstimat: number; totalRealizat: number };
  totalCosturi: { perLuna: Record<string, PlValoare>; totalEstimat: number; totalRealizat: number };
  profit: { perLuna: Record<string, PlValoare>; totalEstimat: number; totalRealizat: number };
}

export function buildPlMonthKeys(from: Date, to: Date): PlMonthKey[] {
  const luni: PlMonthKey[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
  const end = new Date(to.getFullYear(), to.getMonth(), 1);
  while (cursor <= end) {
    luni.push({
      luna: `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`,
      label: cursor.toLocaleDateString("ro-RO", { month: "short", year: "2-digit" }),
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return luni;
}

function emptyPerLuna(luni: PlMonthKey[]): Record<string, PlValoare> {
  return Object.fromEntries(luni.map((l) => [l.luna, { estimat: 0, realizat: 0 }]));
}

function sumPerLuna(luni: PlMonthKey[], sources: Record<string, PlValoare>[]): Record<string, PlValoare> {
  const result = emptyPerLuna(luni);
  for (const luna of luni) {
    let estimat = 0;
    let realizat = 0;
    for (const s of sources) {
      estimat += s[luna.luna]?.estimat ?? 0;
      realizat += s[luna.luna]?.realizat ?? 0;
    }
    result[luna.luna] = { estimat, realizat };
  }
  return result;
}

/**
 * Construieste arborele P&L (Venituri: Recurente/Nerecurente; Costuri:
 * Incadrare -> Clasa), agregat lunar, direct din liniile deja existente in
 * Venituri si Cheltuieli - nu necesita nicio structura noua: Incadrare si
 * Clasa sunt deja nomenclatoare editabile din Setari, gestionate de user.
 *
 * `incadrareOrdine` vine din nomenclatorul "cheltuiala_incadrare" (in
 * ordinea setata acolo) - grupele necunoscute (fara nomenclator, caz rar)
 * apar la final, ordonate alfabetic, ca sa nu dispara silentios din raport.
 */
export function buildPlReport(
  venituriLinii: VenitLinie[],
  cheltuieliLinii: CheltuialaLinie[],
  incadrareOrdine: string[],
  from: Date,
  to: Date
): PlReport {
  const luni = buildPlMonthKeys(from, to);
  const lunaSet = new Set(luni.map((l) => l.luna));

  const venitRecurent: PlLinieValoare = { clasa: "Recurente", perLuna: emptyPerLuna(luni), totalEstimat: 0, totalRealizat: 0 };
  const venitNerecurent: PlLinieValoare = { clasa: "Nerecurente", perLuna: emptyPerLuna(luni), totalEstimat: 0, totalRealizat: 0 };

  for (const l of venituriLinii) {
    const key = l.luna.slice(0, 7);
    if (!lunaSet.has(key)) continue;
    const target = l.tip_venit === "Recurent" ? venitRecurent : venitNerecurent;
    if (!l.mutat_in_linie_id) {
      target.perLuna[key].estimat += l.venit_estimat;
      target.totalEstimat += l.venit_estimat;
    }
    target.perLuna[key].realizat += l.venit_realizat ?? 0;
    target.totalRealizat += l.venit_realizat ?? 0;
  }

  const venituri: PlGrupValoare = {
    incadrare: "VENITURI",
    linii: [venitRecurent, venitNerecurent],
    perLuna: sumPerLuna(luni, [venitRecurent.perLuna, venitNerecurent.perLuna]),
    totalEstimat: venitRecurent.totalEstimat + venitNerecurent.totalEstimat,
    totalRealizat: venitRecurent.totalRealizat + venitNerecurent.totalRealizat,
  };

  const grupMap = new Map<string, Map<string, PlLinieValoare>>();
  for (const l of cheltuieliLinii) {
    const key = l.luna.slice(0, 7);
    if (!lunaSet.has(key)) continue;
    const incadrare = l.incadrare || "ALTELE";
    const clasa = l.clasa || "Necategorizat";
    if (!grupMap.has(incadrare)) grupMap.set(incadrare, new Map());
    const clasaMap = grupMap.get(incadrare)!;
    if (!clasaMap.has(clasa)) {
      clasaMap.set(clasa, { clasa, perLuna: emptyPerLuna(luni), totalEstimat: 0, totalRealizat: 0 });
    }
    const linie = clasaMap.get(clasa)!;
    linie.perLuna[key].estimat += l.valoare_prognozata;
    linie.perLuna[key].realizat += l.valoare_realizata ?? 0;
    linie.totalEstimat += l.valoare_prognozata;
    linie.totalRealizat += l.valoare_realizata ?? 0;
  }

  const orderedIncadrari = [
    ...incadrareOrdine.filter((i) => grupMap.has(i)),
    ...[...grupMap.keys()].filter((i) => !incadrareOrdine.includes(i)).sort((a, b) => a.localeCompare(b, "ro")),
  ];

  const costuriGrupe: PlGrupValoare[] = orderedIncadrari.map((incadrare) => {
    const clasaMap = grupMap.get(incadrare)!;
    const linii = [...clasaMap.values()].sort((a, b) => a.clasa.localeCompare(b.clasa, "ro"));
    return {
      incadrare,
      linii,
      perLuna: sumPerLuna(luni, linii.map((l) => l.perLuna)),
      totalEstimat: linii.reduce((s, l) => s + l.totalEstimat, 0),
      totalRealizat: linii.reduce((s, l) => s + l.totalRealizat, 0),
    };
  });

  const totalCosturiPerLuna = sumPerLuna(luni, costuriGrupe.map((g) => g.perLuna));
  const totalCosturi = {
    perLuna: totalCosturiPerLuna,
    totalEstimat: costuriGrupe.reduce((s, g) => s + g.totalEstimat, 0),
    totalRealizat: costuriGrupe.reduce((s, g) => s + g.totalRealizat, 0),
  };

  const profitPerLuna: Record<string, PlValoare> = {};
  for (const luna of luni) {
    profitPerLuna[luna.luna] = {
      estimat: venituri.perLuna[luna.luna].estimat - totalCosturiPerLuna[luna.luna].estimat,
      realizat: venituri.perLuna[luna.luna].realizat - totalCosturiPerLuna[luna.luna].realizat,
    };
  }

  return {
    luni,
    venituri,
    costuriGrupe,
    totalVenituri: { perLuna: venituri.perLuna, totalEstimat: venituri.totalEstimat, totalRealizat: venituri.totalRealizat },
    totalCosturi,
    profit: {
      perLuna: profitPerLuna,
      totalEstimat: venituri.totalEstimat - totalCosturi.totalEstimat,
      totalRealizat: venituri.totalRealizat - totalCosturi.totalRealizat,
    },
  };
}

export interface PeriodComparisonValue {
  curent: number;
  anterior: number | null;
  variatieProcent: number | null;
}

export interface PeriodComparisons {
  mtdVenituri: number;
  mtdCheltuieli: number;
  mtdProfit: number;
  ytdVenituri: number;
  ytdCheltuieli: number;
  ytdProfit: number;
  momVenituri: PeriodComparisonValue;
  momCheltuieli: PeriodComparisonValue;
  momProfit: PeriodComparisonValue;
  yoyVenituri: PeriodComparisonValue;
  yoyCheltuieli: PeriodComparisonValue;
  yoyProfit: PeriodComparisonValue;
}

function sumRealizatByMonth(
  venituriLinii: VenitLinie[],
  cheltuieliLinii: CheltuialaLinie[]
): { venituri: Map<string, number>; cheltuieli: Map<string, number> } {
  const venituri = new Map<string, number>();
  for (const l of venituriLinii) {
    const key = l.luna.slice(0, 7);
    venituri.set(key, (venituri.get(key) ?? 0) + (l.venit_realizat ?? 0));
  }
  const cheltuieli = new Map<string, number>();
  for (const l of cheltuieliLinii) {
    const key = l.luna.slice(0, 7);
    cheltuieli.set(key, (cheltuieli.get(key) ?? 0) + (l.valoare_realizata ?? 0));
  }
  return { venituri, cheltuieli };
}

function variatie(curent: number, anterior: number | null): PeriodComparisonValue {
  return {
    curent,
    anterior,
    variatieProcent: anterior !== null && anterior !== 0 ? (curent - anterior) / Math.abs(anterior) : null,
  };
}

/**
 * MTD (Month to Date), YTD (Year to Date), MoM (Month over Month) si YoY
 * (Year over Year) - calculate direct din liniile brute de Venituri/
 * Cheltuieli, independent de intervalul selectat in tabelul de mai sus
 * (aceste comparatii se raporteaza mereu la luna/anul CURENT, ca sa fie
 * consistente indiferent ce interval urmaresti in restul paginii).
 */
export function computePeriodComparisons(
  venituriLinii: VenitLinie[],
  cheltuieliLinii: CheltuialaLinie[]
): PeriodComparisons {
  const { venituri: venituriPerLuna, cheltuieli: cheltuieliPerLuna } = sumRealizatByMonth(
    venituriLinii,
    cheltuieliLinii
  );

  const azi = new Date();
  const anCurent = azi.getFullYear();
  const lunaCurenta = azi.getMonth() + 1; // 1-12
  const lunaCurentaKey = `${anCurent}-${String(lunaCurenta).padStart(2, "0")}`;

  const lunaAnterioara = new Date(anCurent, lunaCurenta - 2, 1); // luna - 1 (0-indexat -> -2)
  const lunaAnterioaraKey = `${lunaAnterioara.getFullYear()}-${String(lunaAnterioara.getMonth() + 1).padStart(2, "0")}`;

  const aceeasiLunaAnulTrecutKey = `${anCurent - 1}-${String(lunaCurenta).padStart(2, "0")}`;

  const mtdVenituri = venituriPerLuna.get(lunaCurentaKey) ?? 0;
  const mtdCheltuieli = cheltuieliPerLuna.get(lunaCurentaKey) ?? 0;

  let ytdVenituri = 0;
  let ytdCheltuieli = 0;
  for (let l = 1; l <= lunaCurenta; l++) {
    const key = `${anCurent}-${String(l).padStart(2, "0")}`;
    ytdVenituri += venituriPerLuna.get(key) ?? 0;
    ytdCheltuieli += cheltuieliPerLuna.get(key) ?? 0;
  }

  const momVenituriAnterior = venituriPerLuna.get(lunaAnterioaraKey) ?? null;
  const momCheltuieliAnterior = cheltuieliPerLuna.get(lunaAnterioaraKey) ?? null;
  const yoyVenituriAnterior = venituriPerLuna.has(aceeasiLunaAnulTrecutKey)
    ? venituriPerLuna.get(aceeasiLunaAnulTrecutKey)!
    : null;
  const yoyCheltuieliAnterior = cheltuieliPerLuna.has(aceeasiLunaAnulTrecutKey)
    ? cheltuieliPerLuna.get(aceeasiLunaAnulTrecutKey)!
    : null;

  return {
    mtdVenituri,
    mtdCheltuieli,
    mtdProfit: mtdVenituri - mtdCheltuieli,
    ytdVenituri,
    ytdCheltuieli,
    ytdProfit: ytdVenituri - ytdCheltuieli,
    momVenituri: variatie(mtdVenituri, momVenituriAnterior),
    momCheltuieli: variatie(mtdCheltuieli, momCheltuieliAnterior),
    momProfit: variatie(
      mtdVenituri - mtdCheltuieli,
      momVenituriAnterior !== null && momCheltuieliAnterior !== null
        ? momVenituriAnterior - momCheltuieliAnterior
        : null
    ),
    yoyVenituri: variatie(mtdVenituri, yoyVenituriAnterior),
    yoyCheltuieli: variatie(mtdCheltuieli, yoyCheltuieliAnterior),
    yoyProfit: variatie(
      mtdVenituri - mtdCheltuieli,
      yoyVenituriAnterior !== null && yoyCheltuieliAnterior !== null
        ? yoyVenituriAnterior - yoyCheltuieliAnterior
        : null
    ),
  };
}

export const LUNI_LABELS = [
  "Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export interface AnComparisonDatum {
  an: number;
  venituri: number;
  cheltuieli: number;
  profit: number;
  variatieProcent: number | null;
}

/**
 * Total realizat pe an, pentru anii selectati liber (nu neaparat
 * consecutivi) - filtrat, optional, doar pe anumite luni (ex. doar Q1).
 * Variatia procentuala se calculeaza fata de anul ANTERIOR DIN SELECTIE
 * (ordinea in care apar in `ani`), nu neaparat anul calendaristic anterior -
 * daca alegi 2023 si 2025 (sarind 2024), 2025 se compara cu 2023.
 */
export function computeMultiYearComparison(
  venituriLinii: VenitLinie[],
  ani: number[],
  luni: number[] = []
): AnComparisonDatum[] {
  const aniSortati = [...ani].sort((a, b) => a - b);
  const totaluri = aniSortati.map((an) => {
    let venituri = 0;
    for (const l of venituriLinii) {
      const d = new Date(l.luna);
      if (d.getFullYear() !== an) continue;
      if (luni.length > 0 && !luni.includes(d.getMonth() + 1)) continue;
      venituri += l.venit_realizat ?? 0;
    }
    return { an, venituri };
  });

  return totaluri.map((d, idx) => {
    if (idx === 0) {
      return { an: d.an, venituri: d.venituri, cheltuieli: 0, profit: d.venituri, variatieProcent: null };
    }
    const anterior = totaluri[idx - 1];
    const variatieProcent = anterior.venituri > 0 ? ((d.venituri - anterior.venituri) / anterior.venituri) * 100 : null;
    return { an: d.an, venituri: d.venituri, cheltuieli: 0, profit: d.venituri, variatieProcent };
  });
}

export interface LunaAnComparisonDatum {
  luna: number;
  label: string;
  valori: Record<number, number>;
}

/** Total realizat, pe fiecare luna (1-12), separat pentru fiecare an
 * selectat - pentru graficul cu o linie per an, ca sa compari traiectoria
 * lunara intre ani. */
export function computeMonthByYearComparison(venituriLinii: VenitLinie[], ani: number[]): LunaAnComparisonDatum[] {
  return Array.from({ length: 12 }, (_, i) => {
    const luna = i + 1;
    const valori: Record<number, number> = {};
    for (const an of ani) {
      let total = 0;
      for (const l of venituriLinii) {
        const d = new Date(l.luna);
        if (d.getFullYear() === an && d.getMonth() + 1 === luna) total += l.venit_realizat ?? 0;
      }
      valori[an] = total;
    }
    return { luna, label: LUNI_LABELS[i], valori };
  });
}

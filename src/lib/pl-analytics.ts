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
    target.perLuna[key].estimat += l.venit_estimat;
    target.perLuna[key].realizat += l.venit_realizat ?? 0;
    target.totalEstimat += l.venit_estimat;
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

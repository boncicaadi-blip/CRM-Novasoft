import type { PartnerOverviewRow } from "@/lib/data/parteneri-admin";

/** Distanta Levenshtein (nr. minim de editari intre doua siruri) - folosita pentru detectarea numelor asemanatoare (ex. typo-uri ca "Lexton"/"Lextrom"). */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Grupeaza partenerii care au acelasi CIF completat (pe randuri diferite) - candidati de fuziune, cea mai sigura potrivire. */
export function findDuplicatesByCif(partners: PartnerOverviewRow[]): PartnerOverviewRow[][] {
  const byCif = new Map<string, PartnerOverviewRow[]>();
  for (const p of partners) {
    if (!p.cod_fiscal) continue;
    const key = p.cod_fiscal.trim().toUpperCase();
    if (!byCif.has(key)) byCif.set(key, []);
    byCif.get(key)!.push(p);
  }
  return Array.from(byCif.values()).filter((group) => group.length > 1);
}

/**
 * Grupeaza perechi de parteneri cu nume foarte asemanator (typo-uri de tipul
 * "Lexton"/"Lextrom") - NU garanteaza ca sunt aceeasi firma, doar le
 * semnaleaza rapid pentru verificare manuala. Exclude perechile deja
 * prinse de findDuplicatesByCif (acelea sunt deja sigure).
 */
export function findSimilarNamePairs(
  partners: PartnerOverviewRow[]
): { a: PartnerOverviewRow; b: PartnerOverviewRow; distanta: number }[] {
  const cifGroups = new Set(
    findDuplicatesByCif(partners).flatMap((group) => group.map((p) => p.id))
  );

  const candidati = partners.filter((p) => !cifGroups.has(p.id));
  const perechi: { a: PartnerOverviewRow; b: PartnerOverviewRow; distanta: number }[] = [];

  for (let i = 0; i < candidati.length; i++) {
    for (let j = i + 1; j < candidati.length; j++) {
      const a = candidati[i];
      const b = candidati[j];
      // Daca ambii au CIF completat si sunt diferite - clar firme diferite, sarim peste.
      if (a.cod_fiscal && b.cod_fiscal && a.cod_fiscal !== b.cod_fiscal) continue;

      const lungimeMax = Math.max(a.nume_normalizat.length, b.nume_normalizat.length);
      if (Math.abs(a.nume_normalizat.length - b.nume_normalizat.length) > 3) continue;
      if (lungimeMax < 4) continue;

      const distanta = levenshtein(a.nume_normalizat, b.nume_normalizat);
      const prag = lungimeMax <= 8 ? 2 : 3;
      if (distanta > 0 && distanta <= prag) {
        perechi.push({ a, b, distanta });
      }
    }
  }

  return perechi.sort((x, y) => x.distanta - y.distanta);
}

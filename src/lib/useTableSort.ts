import { useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

/**
 * Hook generic de sortare pentru tabele - functioneaza cu orice tip de date,
 * primind o functie care extrage valoarea de sortat pentru o cheie data.
 * Click pe acelasi antet inverseaza directia; click pe alt antet reseteaza
 * la ascendent.
 */
export function useTableSort<T>(
  data: T[],
  getSortValue: (item: T, key: string) => string | number | null
) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDir]);

  function requestSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  return { sorted, sortKey, sortDir, requestSort };
}

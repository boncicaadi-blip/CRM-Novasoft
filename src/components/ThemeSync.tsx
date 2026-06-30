"use client";

import { useEffect } from "react";
import type { ThemePreference } from "@/lib/hooks/useTheme";

/**
 * Sincronizeaza preferinta de tema din DB (sursa de adevar reala, valabila
 * pe orice dispozitiv) catre localStorage si DOM, la fiecare incarcare a
 * aplicatiei. Scriptul inline din layout.tsx aplica deja o valoare din
 * localStorage instant (fara FOUC), iar aici corectam daca DB-ul are o
 * valoare diferita (ex. user schimbat tema pe alt dispozitiv).
 */
export function ThemeSync({ dbTheme }: { dbTheme: ThemePreference }) {
  useEffect(() => {
    const stored = localStorage.getItem("novasoft-theme");
    if (stored === dbTheme) return;

    localStorage.setItem("novasoft-theme", dbTheme);
    const resolved =
      dbTheme === "system"
        ? window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark"
        : dbTheme;
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(resolved);
  }, [dbTheme]);

  return null;
}

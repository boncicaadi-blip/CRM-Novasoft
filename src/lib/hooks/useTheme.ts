"use client";

import { useEffect, useState, useCallback } from "react";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "novasoft-theme";

function resolveTheme(pref: ThemePreference): "light" | "dark" {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  return pref;
}

function applyTheme(pref: ThemePreference) {
  const resolved = resolveTheme(pref);
  const html = document.documentElement;
  html.classList.remove("light", "dark");
  html.classList.add(resolved);
}

/**
 * Hook pentru citirea/schimbarea temei UI. Scrie in localStorage (aplicat
 * imediat, fara reload) - persistarea in DB (profiles.theme) se face
 * separat, prin Server Action, la schimbare explicita din Profil.
 */
export function useTheme(initialPreference: ThemePreference = "dark") {
  // Initializare lazy: citim direct din localStorage la primul render,
  // fara setState intr-un effect (ar cauza un render suplimentar in plus
  // fata de cel necesar - regula react-hooks/preserve-manual-memoization).
  const [preference, setPreferenceState] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return initialPreference;
    return (localStorage.getItem(STORAGE_KEY) as ThemePreference | null) ?? initialPreference;
  });

  useEffect(() => {
    applyTheme(preference);
    // Aplicam tema o singura data la mount, pe baza valorii initiale -
    // schimbarile ulterioare trec prin setPreference, care aplica direct.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const handler = () => applyTheme("system");
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [preference]);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    localStorage.setItem(STORAGE_KEY, pref);
    applyTheme(pref);
  }, []);

  return { preference, setPreference };
}

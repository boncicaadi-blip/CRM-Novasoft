import { useEffect, type RefObject } from "react";

/**
 * Leaga Ctrl+S / Cmd+S de submit-ul unui formular, oriunde pe pagina e activ
 * acel formular (nu necesita focus pe un camp anume). Preveni comportamentul
 * implicit al browserului (Save Page As).
 */
export function useSaveShortcut(formRef: RefObject<HTMLFormElement | null>, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const isSaveCombo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
      if (!isSaveCombo) return;
      e.preventDefault();
      formRef.current?.requestSubmit();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [formRef, enabled]);
}

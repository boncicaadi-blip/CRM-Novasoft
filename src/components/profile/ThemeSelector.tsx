"use client";

import { useState, useTransition } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme, type ThemePreference } from "@/lib/hooks/useTheme";
import { updateThemePreferenceAction } from "@/lib/actions/users";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Luminos", icon: Sun },
  { value: "dark", label: "Intunecat", icon: Moon },
  { value: "system", label: "Sistem", icon: Monitor },
];

export function ThemeSelector({ initialTheme }: { initialTheme: ThemePreference }) {
  const { preference, setPreference } = useTheme(initialTheme);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSelect(value: ThemePreference) {
    setPreference(value);
    setSaved(false);
    startTransition(async () => {
      await updateThemePreferenceAction(value);
      setSaved(true);
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = preference === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              disabled={isPending}
              className={`flex flex-1 flex-col items-center gap-1.5 rounded-lg border px-3 py-3 text-xs transition ${
                isActive
                  ? "border-[#E8007A] bg-[#E8007A]/10 text-[#E8007A]"
                  : "border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--surface-2)]"
              }`}
            >
              <Icon size={16} />
              {opt.label}
            </button>
          );
        })}
      </div>
      {saved && <p className="mt-2 text-[11px] text-green-400">Salvat.</p>}
    </div>
  );
}

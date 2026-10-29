"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_ACCENT } from "@/config/brand";

export type ThemePref = "light" | "dark" | "system";
export type Accent = "lime" | "mint" | "cyan" | "magenta";

export const ACCENTS: { id: Accent; label: string; hex: string }[] = [
  { id: "lime", label: "Lime", hex: "#C6F432" },
  { id: "mint", label: "Mint", hex: "#3DFFA2" },
  { id: "cyan", label: "Cyan", hex: "#22E4FF" },
  { id: "magenta", label: "Magenta", hex: "#FF4FD8" },
];

function read<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T) || fallback;
  } catch {
    return fallback;
  }
}

function apply(theme: ThemePref, accent: Accent) {
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.dataset.accent = accent;
}

/** Theme + accent preference, persisted per browser. */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemePref>("system");
  const [accent, setAccentState] = useState<Accent>(DEFAULT_ACCENT);

  useEffect(() => {
    // Sync with what ThemeScript applied before hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(read<ThemePref>("arw-theme", "system"));
    setAccentState(read<Accent>("arw-accent", DEFAULT_ACCENT));
  }, []);

  const setTheme = useCallback(
    (t: ThemePref) => {
      setThemeState(t);
      try { localStorage.setItem("arw-theme", t); } catch {}
      apply(t, accent);
    },
    [accent],
  );

  const setAccent = useCallback(
    (a: Accent) => {
      setAccentState(a);
      try { localStorage.setItem("arw-accent", a); } catch {}
      apply(theme, a);
    },
    [theme],
  );

  return { theme, accent, setTheme, setAccent };
}

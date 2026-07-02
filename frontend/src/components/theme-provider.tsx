"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Mode = "light" | "dark";

export type AccentOption = {
  name: string;
  value: string; 
};

export const ACCENT_OPTIONS: AccentOption[] = [
  { name: "Chartreuse", value: "183 202 93" },
  { name: "Basil", value: "29 111 95" },
  { name: "Ember", value: "212 95 58" },
  { name: "Amber", value: "217 158 44" },
  { name: "Teal", value: "24 148 148" },
  { name: "Sky", value: "42 130 214" },
  { name: "Violet", value: "124 92 214" },
  { name: "Rose", value: "214 78 122" },
];

const MODE_STORAGE_KEY = "ceoai-theme-mode";
const ACCENT_STORAGE_KEY = "ceoai-theme-accent";

type ThemeContextValue = {
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
  accent: string;
  setAccent: (value: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>("light");
  const [accent, setAccentState] = useState<string>(ACCENT_OPTIONS[0].value);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedMode = window.localStorage.getItem(MODE_STORAGE_KEY) as Mode | null;
    const storedAccent = window.localStorage.getItem(ACCENT_STORAGE_KEY);
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;

    const initialMode = storedMode ?? (prefersDark ? "dark" : "light");
    setModeState(initialMode);
    if (storedAccent) setAccentState(storedAccent);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.toggle("dark", mode === "dark");
    window.localStorage.setItem(MODE_STORAGE_KEY, mode);
  }, [mode, mounted]);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.style.setProperty("--color-accent", accent);
    window.localStorage.setItem(ACCENT_STORAGE_KEY, accent);
  }, [accent, mounted]);

  const setMode = useCallback((next: Mode) => setModeState(next), []);
  const toggleMode = useCallback(() => setModeState((current) => (current === "dark" ? "light" : "dark")), []);
  const setAccent = useCallback((value: string) => setAccentState(value), []);

  const value = useMemo(
    () => ({ mode, setMode, toggleMode, accent, setAccent }),
    [mode, setMode, toggleMode, accent, setAccent],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

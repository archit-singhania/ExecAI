"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Mode = "light" | "dark";

export type AccentOption = {
  name: string;
  value: string;
};

export type SurfaceOption = {
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
  { name: "Lime", value: "132 190 84" },
  { name: "Cobalt", value: "51 99 209" },
  { name: "Coral", value: "224 108 92" },
  { name: "Gold", value: "196 155 61" },
  { name: "Orchid", value: "170 96 196" },
  { name: "Jade", value: "38 150 122" },
  { name: "Crimson", value: "196 58 78" },
  { name: "Slate Blue", value: "90 110 158" },
];

export const SURFACE_OPTIONS: { light: SurfaceOption[]; dark: SurfaceOption[] } = {
  light: [
    { name: "Paper", value: "255 255 255" },
    { name: "Linen", value: "250 247 240" },
    { name: "Mist", value: "244 247 246" },
    { name: "Blush", value: "250 244 246" },
    { name: "Sand", value: "249 246 238" },
    { name: "Sky", value: "244 248 251" },
    { name: "Sage", value: "245 248 242" },
    { name: "Pearl", value: "248 247 250" },
  ],
  dark: [
    { name: "Slate", value: "23 27 32" },
    { name: "Onyx", value: "18 20 24" },
    { name: "Charcoal", value: "27 27 30" },
    { name: "Midnight", value: "16 20 28" },
    { name: "Forest", value: "18 24 22" },
    { name: "Plum", value: "24 19 27" },
    { name: "Espresso", value: "26 22 20" },
    { name: "Ink Blue", value: "17 22 30" },
  ],
};

const MODE_STORAGE_KEY = "ceoai-theme-mode";
const ACCENT_STORAGE_KEY = "ceoai-theme-accent";
const SURFACE_LIGHT_STORAGE_KEY = "ceoai-theme-surface-light";
const SURFACE_DARK_STORAGE_KEY = "ceoai-theme-surface-dark";

type ThemeContextValue = {
  mode: Mode;
  setMode: (mode: Mode) => void;
  toggleMode: () => void;
  accent: string;
  setAccent: (value: string) => void;
  surface: string;
  setSurface: (value: string) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<Mode>("light");
  const [accent, setAccentState] = useState<string>(ACCENT_OPTIONS[0].value);
  const [surfaceLight, setSurfaceLight] = useState<string>(SURFACE_OPTIONS.light[0].value);
  const [surfaceDark, setSurfaceDark] = useState<string>(SURFACE_OPTIONS.dark[0].value);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedMode = window.localStorage.getItem(MODE_STORAGE_KEY) as Mode | null;
    const storedAccent = window.localStorage.getItem(ACCENT_STORAGE_KEY);
    const storedSurfaceLight = window.localStorage.getItem(SURFACE_LIGHT_STORAGE_KEY);
    const storedSurfaceDark = window.localStorage.getItem(SURFACE_DARK_STORAGE_KEY);
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;

    const initialMode = storedMode ?? (prefersDark ? "dark" : "light");
    setModeState(initialMode);
    if (storedAccent) setAccentState(storedAccent);
    if (storedSurfaceLight) setSurfaceLight(storedSurfaceLight);
    if (storedSurfaceDark) setSurfaceDark(storedSurfaceDark);
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

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.style.setProperty("--color-surface", mode === "dark" ? surfaceDark : surfaceLight);
    window.localStorage.setItem(SURFACE_LIGHT_STORAGE_KEY, surfaceLight);
    window.localStorage.setItem(SURFACE_DARK_STORAGE_KEY, surfaceDark);
  }, [mode, surfaceLight, surfaceDark, mounted]);

  const setMode = useCallback((next: Mode) => setModeState(next), []);
  const toggleMode = useCallback(() => setModeState((current) => (current === "dark" ? "light" : "dark")), []);
  const setAccent = useCallback((value: string) => setAccentState(value), []);
  const setSurface = useCallback(
    (value: string) => {
      if (mode === "dark") setSurfaceDark(value);
      else setSurfaceLight(value);
    },
    [mode],
  );

  const value = useMemo(
    () => ({
      mode,
      setMode,
      toggleMode,
      accent,
      setAccent,
      surface: mode === "dark" ? surfaceDark : surfaceLight,
      setSurface,
    }),
    [mode, setMode, toggleMode, accent, setAccent, surfaceDark, surfaceLight, setSurface],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Moon, Palette, Sun } from "lucide-react";
import { ACCENT_OPTIONS, useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeModeToggle() {
  const { mode, toggleMode } = useTheme();
  const isDark = mode === "dark";

  return (
    <button
      type="button"
      onClick={toggleMode}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md border border-ink/10 bg-white/60 text-ink transition hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
    >
      <Sun
        size={17}
        className={cn(
          "absolute transition-all duration-300",
          isDark ? "translate-y-6 opacity-0" : "translate-y-0 opacity-100",
        )}
      />
      <Moon
        size={17}
        className={cn(
          "absolute transition-all duration-300",
          isDark ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0",
        )}
      />
    </button>
  );
}

export function AccentPicker() {
  const { accent, setAccent } = useTheme();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label="Change accent color"
        title="Change accent color"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-ink/10 bg-white/60 text-ink transition hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
      >
        <Palette size={17} className="text-accent" />
      </button>

      {open ? (
        <div className="animate-pop-in absolute right-0 top-12 z-40 w-56 rounded-lg border border-ink/10 bg-white/95 p-3 text-ink shadow-soft backdrop-blur-xl dark:bg-[#171b20]/95">
          <p className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.18em] text-steel">Accent</p>
          <div className="grid grid-cols-4 gap-2">
            {ACCENT_OPTIONS.map((option) => {
              const active = option.value === accent;
              return (
                <button
                  key={option.name}
                  type="button"
                  title={option.name}
                  onClick={() => setAccent(option.value)}
                  className={cn(
                    "relative grid h-9 w-9 place-items-center rounded-full ring-2 ring-offset-2 ring-offset-white transition dark:ring-offset-[#171b20]",
                    active ? "ring-ink" : "ring-transparent hover:ring-ink/20",
                  )}
                  style={{ backgroundColor: `rgb(${option.value})` }}
                >
                  {active ? <Check size={14} className="text-white drop-shadow" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

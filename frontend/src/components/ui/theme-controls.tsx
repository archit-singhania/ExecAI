"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Moon, Palette, Sun } from "lucide-react";
import { ACCENT_OPTIONS, SURFACE_OPTIONS, useTheme } from "@/components/theme-provider";
import { useLocale } from "@/lib/i18n";
import { useRipple } from "@/lib/use-ripple";
import { cn } from "@/lib/utils";

export function ThemeModeToggle() {
  const { mode, toggleMode } = useTheme();
  const { ripples, onMouseDown } = useRipple();
  const isDark = mode === "dark";

  return (
    <button
      type="button"
      onMouseDown={onMouseDown}
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
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="ripple-span"
          style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size }}
          aria-hidden
        />
      ))}
    </button>
  );
}

function Swatch({
  color,
  active,
  onSelect,
  title,
}: {
  color: string;
  active: boolean;
  onSelect: () => void;
  title: string;
}) {
  const { ripples, onMouseDown } = useRipple();
  return (
    <button
      type="button"
      title={title}
      onMouseDown={onMouseDown}
      onClick={onSelect}
      className={cn(
        "relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-white transition dark:ring-offset-[#171b20]",
        active ? "ring-ink" : "ring-transparent hover:ring-ink/20",
      )}
      style={{ backgroundColor: `rgb(${color})` }}
    >
      {active ? <Check size={13} className="text-white drop-shadow" /> : null}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="ripple-span"
          style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size }}
          aria-hidden
        />
      ))}
    </button>
  );
}

export function ThemeConfigurator() {
  const { mode, accent, setAccent, surface, setSurface } = useTheme();
  const { rtl, toggleRtl } = useLocale();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { ripples, onMouseDown } = useRipple();
  const surfaceOptions = mode === "dark" ? SURFACE_OPTIONS.dark : SURFACE_OPTIONS.light;

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
        onMouseDown={onMouseDown}
        onClick={() => setOpen((current) => !current)}
        aria-label="Open theme configurator"
        title="Theme configurator"
        className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md border border-ink/10 bg-white/60 text-ink transition hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
      >
        <Palette size={17} className="text-accent" />
        {ripples.map((ripple) => (
          <span
            key={ripple.id}
            className="ripple-span"
            style={{ left: ripple.x, top: ripple.y, width: ripple.size, height: ripple.size }}
            aria-hidden
          />
        ))}
      </button>

      {open ? (
        <div className="animate-pop-in absolute end-0 top-12 z-40 w-64 rounded-lg border border-ink/10 bg-white/95 p-3 text-ink shadow-soft backdrop-blur-xl dark:bg-[#171b20]/95">
          <p className="mb-2 px-1 text-[11px] font-black uppercase tracking-[0.18em] text-steel">Primary</p>
          <div className="grid grid-cols-8 gap-1.5">
            {ACCENT_OPTIONS.map((option) => (
              <Swatch
                key={option.name}
                color={option.value}
                title={option.name}
                active={option.value === accent}
                onSelect={() => setAccent(option.value)}
              />
            ))}
          </div>

          <p className="mb-2 mt-4 px-1 text-[11px] font-black uppercase tracking-[0.18em] text-steel">Surface</p>
          <div className="grid grid-cols-8 gap-1.5">
            {surfaceOptions.map((option) => (
              <Swatch
                key={option.name}
                color={option.value}
                title={option.name}
                active={option.value === surface}
                onSelect={() => setSurface(option.value)}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-ink/10 pt-3 dark:border-fog/10">
            <span className="text-xs font-bold text-steel">RTL layout</span>
            <button
              type="button"
              role="switch"
              aria-checked={rtl}
              onClick={toggleRtl}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition",
                rtl ? "bg-accent" : "bg-ink/15 dark:bg-white/15",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                  rtl ? "start-[22px]" : "start-0.5",
                )}
              />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

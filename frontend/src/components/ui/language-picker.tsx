"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Globe } from "lucide-react";
import { LOCALES, useLocale } from "@/lib/i18n";
import { useRipple } from "@/lib/use-ripple";
import { cn } from "@/lib/utils";

export function LanguagePicker() {
  const { locale, setLocale } = useLocale();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { ripples, onMouseDown } = useRipple();

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

  const active = LOCALES.find((option) => option.code === locale);

  return (
    <div className="relative" ref={wrapperRef}>
      <button
        type="button"
        onMouseDown={onMouseDown}
        onClick={() => setOpen((current) => !current)}
        aria-label="Change language"
        title="Change language"
        className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md border border-ink/10 bg-white/60 text-ink transition hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
      >
        <Globe size={17} />
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
        <div className="animate-pop-in absolute end-0 top-12 z-40 w-52 rounded-lg border border-ink/10 bg-white/95 p-2 text-ink shadow-soft backdrop-blur-xl dark:bg-[#171b20]/95">
          <p className="mb-1 px-2 pt-1 text-[11px] font-black uppercase tracking-[0.18em] text-steel">Language</p>
          <div className="flex flex-col gap-0.5">
            {LOCALES.map((option) => {
              const isActive = option.code === locale;
              return (
                <button
                  key={option.code}
                  type="button"
                  onClick={() => {
                    setLocale(option.code);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-semibold transition",
                    isActive ? "bg-ink/8 text-ink dark:bg-white/10" : "text-steel hover:bg-ink/5 hover:text-ink dark:hover:bg-white/5",
                  )}
                >
                  <span className="text-base leading-none">{option.flag}</span>
                  <span className="flex-1 truncate">{option.nativeLabel}</span>
                  {isActive ? <Check size={14} className="shrink-0 text-accent" /> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

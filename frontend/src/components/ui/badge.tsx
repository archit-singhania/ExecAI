"use client";

import { ReactNode, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   Badge — status with a shape as well as a colour, so conviction and health
   states remain readable without colour vision.
--------------------------------------------------------------------------- */

export function Badge({
  children,
  tone = "neutral",
  dot,
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "positive" | "caution" | "critical";
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("ui-badge", className)}
      data-tone={tone === "neutral" ? undefined : tone}
    >
      {dot ? <span className="ui-badge-dot" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   SegmentedControl — replaces the bespoke 7/30/90 selector in analytics.
   The thumb is measured from the real DOM so it stays correct with any
   number of options at any label length.
--------------------------------------------------------------------------- */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
  /** Accessible name for the group, e.g. "Time range". */
  label: string;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ left: 0, width: 0 });

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    function measure() {
      const node = wrap!.querySelector<HTMLElement>('[data-active="true"]');
      if (!node) return;
      setThumb({ left: node.offsetLeft, width: node.offsetWidth });
    }

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [value, options]);

  function onKeyDown(event: React.KeyboardEvent) {
    const index = options.findIndex((option) => option.value === value);
    if (index < 0) return;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault();
      onChange(options[(index + 1) % options.length].value);
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault();
      onChange(options[(index - 1 + options.length) % options.length].value);
    }
  }

  return (
    <div
      ref={wrapRef}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("ui-seg", className)}
    >
      <span
        className="ui-seg-thumb"
        aria-hidden="true"
        style={{ transform: `translateX(${thumb.left - 3}px)`, width: thumb.width }}
      />
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            data-active={active}
            onClick={() => onChange(option.value)}
            className="ui-seg-option"
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Tooltip — CSS-driven, so no positioning library and no layout thrash.
   Opens on hover and on keyboard focus.
--------------------------------------------------------------------------- */

export function Tooltip({
  content,
  side = "top",
  children,
  className,
}: {
  content: string;
  side?: "top" | "bottom";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("ui-tip", className)}>
      {children}
      <span className="ui-tip-bubble" role="tooltip" data-side={side}>
        {content}
      </span>
    </span>
  );
}

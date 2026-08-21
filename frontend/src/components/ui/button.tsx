"use client";

import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { useRipple } from "@/lib/use-ripple";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "quiet" | "danger";
  size?: "sm" | "md";
};

/**
 * Variants:
 *   primary — the one action on the screen. Solid ink.
 *   ghost   — secondary actions. Hairline border on a raised surface.
 *   quiet   — tertiary / dismissive. No chrome until hover.
 *   danger  — destructive confirmation only. Never the default in a dialog.
 *
 * All values reference tokens. Do not add raw colours or durations here.
 */
export function Button({
  className,
  variant = "primary",
  size = "md",
  onMouseDown,
  children,
  ...props
}: ButtonProps) {
  const { ripples, onMouseDown: fireRipple } = useRipple();

  return (
    <button
      onMouseDown={(event) => {
        fireRipple(event);
        onMouseDown?.(event);
      }}
      className={cn(
        "relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-md font-semibold",
        "transition-[background-color,box-shadow,transform,opacity] duration-fast ease-out",
        "active:scale-[0.985] active:duration-instant",
        "disabled:pointer-events-none disabled:opacity-50",

        size === "md" && "h-11 px-4 text-sm",
        size === "sm" && "h-9 px-3 text-xs",

        variant === "primary" &&
          "bg-ink text-fog shadow-2 hover:shadow-3 hover:-translate-y-px",

        variant === "ghost" &&
          "bg-surface-raised text-ink shadow-line hover:shadow-2 hover:-translate-y-px",

        variant === "quiet" && "text-steel hover:bg-ink/5 hover:text-ink",

        variant === "danger" &&
          "bg-critical text-white shadow-2 hover:shadow-3 hover:-translate-y-px",

        className,
      )}
      {...props}
    >
      {children}
      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="ripple-span"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
          }}
          aria-hidden
        />
      ))}
    </button>
  );
}

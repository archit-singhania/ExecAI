"use client";

import { X } from "lucide-react";
import { ReactNode, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Modal dialog and side sheet.
 *
 * Handles the four things the existing .sec-sheet markup does not: focus is
 * moved in on open, trapped while open, restored to the trigger on close, and
 * the page behind is inert to scroll. Escape closes.
 *
 * If you later add @radix-ui/react-dialog, delete this and keep the CSS —
 * the class names are compatible.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  variant = "dialog",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  variant?: "dialog" | "sheet";
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;

      const nodes = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((node) => node.offsetParent !== null);

      if (nodes.length === 0) {
        event.preventDefault();
        return;
      }

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    // Focus the first control, or the panel itself if there is none.
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel).focus();
    });

    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = overflow;
      restoreTo.current?.focus?.();
    };
  }, [open, handleKeyDown]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <>
      <div className="ui-scrim" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(variant === "sheet" ? "ui-sheet" : "ui-dialog", className)}
      >
        <div className="ui-dialog-head">
          <div className="min-w-0">
            <h2 className="ui-dialog-title">{title}</h2>
            {description ? <p className="ui-card-desc">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-dialog-close"
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        {children}

        {footer ? <div className="ui-dialog-foot">{footer}</div> : null}
      </div>
    </>,
    document.body,
  );
}

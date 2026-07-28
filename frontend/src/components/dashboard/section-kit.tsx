"use client";

import { ReactNode, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { MetroTone, TONE_GLOW_HEX } from "@/components/dashboard/metro-tile";
import { cn } from "@/lib/utils";

export function toneVars(tone: MetroTone) {
  const hex = TONE_GLOW_HEX[tone];
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return {
    "--sec-accent": hex,
    "--sec-accent-12": `rgba(${r}, ${g}, ${b}, 0.12)`,
    "--sec-accent-22": `rgba(${r}, ${g}, ${b}, 0.22)`,
    "--sec-accent-40": `rgba(${r}, ${g}, ${b}, 0.4)`,
  } as React.CSSProperties;
}

export function SectionHeader({
  eyebrow,
  title,
  icon: Icon,
  meta,
  actions,
}: {
  eyebrow: string;
  title: string;
  icon: React.ElementType;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="sec-header flex flex-wrap items-center justify-between gap-3 pb-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="sec-header-icon grid h-10 w-10 shrink-0 place-items-center rounded-lg">
          <Icon size={18} strokeWidth={1.9} />
        </div>
        <div className="min-w-0">
          <p className="sec-eyebrow">{eyebrow}</p>
          <h2 className="truncate text-lg font-bold leading-tight tracking-[-0.01em] sm:text-xl">{title}</h2>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {meta}
        {actions}
      </div>
    </div>
  );
}

export function MetricStat({
  label,
  value,
  hint,
  emphasis = false,
}: {
  label: string;
  value: string | number;
  hint?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="sec-metric rounded-lg px-3.5 py-3">
      <p className="sec-metric-label">{label}</p>
      <p
        className={cn(
          "mt-1 font-black tabular-nums leading-none tracking-[-0.02em]",
          emphasis ? "text-[1.75rem]" : "text-xl",
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[0.7rem] font-semibold leading-tight text-steel">{hint}</p> : null}
    </div>
  );
}

export function MetricRow({ children }: { children: ReactNode }) {
  return <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">{children}</div>;
}

function scoreColor(score: number) {
  if (score >= 85) return "#1d6f5f";
  if (score >= 70) return "#5b7ad6";
  if (score >= 50) return "#b7ca5d";
  return "#d45f3a";
}

export function ScoreRing({ score, size = 42 }: { score: number; size?: number }) {
  const stroke = size >= 56 ? 4 : 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const dash = (clamped / 100) * circumference;
  const color = scoreColor(clamped);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`Score ${clamped} out of 100`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-ink/10 dark:stroke-fog/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          stroke={color}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="sec-ring-arc"
        />
      </svg>
      <span
        className="absolute inset-0 grid place-items-center font-black tabular-nums leading-none"
        style={{ fontSize: size >= 56 ? "0.95rem" : "0.72rem", color }}
      >
        {clamped}
      </span>
    </div>
  );
}

export function FilterRail({
  options,
  value,
  onChange,
  counts,
}: {
  options: string[];
  value: string;
  onChange: (next: string) => void;
  counts?: Record<string, number>;
}) {
  return (
    <div className="sec-rail mb-4 flex gap-1 overflow-x-auto p-1">
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={cn("sec-rail-item shrink-0", active && "sec-rail-item-active")}
          >
            {option}
            {counts && counts[option] !== undefined ? (
              <span className="sec-rail-count tabular-nums">{counts[option]}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="sec-empty grid place-items-center rounded-lg px-6 py-12 text-center">
      <div className="sec-empty-icon mb-3 grid h-12 w-12 place-items-center rounded-xl">
        <Icon size={22} strokeWidth={1.6} />
      </div>
      <p className="text-sm font-bold">{title}</p>
      <p className="mt-1.5 max-w-sm text-[0.8rem] font-medium leading-6 text-steel">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 3xl:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="sec-card rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="sec-skel h-10 w-10 shrink-0 rounded-md" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="sec-skel h-2.5 w-20 rounded-full" />
              <div className="sec-skel h-3.5 w-4/5 rounded-full" />
              <div className="sec-skel h-2.5 w-full rounded-full" />
              <div className="sec-skel h-2.5 w-3/5 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DetailSheet({
  open,
  onClose,
  eyebrow,
  title,
  badge,
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title?: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      if (returnFocusRef.current instanceof HTMLElement) returnFocusRef.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sec-sheet-root fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Close panel"
        onClick={onClose}
        className="sec-sheet-scrim absolute inset-0"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Detail"}
        className="sec-sheet relative flex h-full w-full max-w-xl flex-col outline-none"
      >
        <div className="sec-sheet-head flex items-start justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            {eyebrow ? <p className="sec-eyebrow">{eyebrow}</p> : null}
            {title ? <h3 className="mt-1 text-lg font-bold leading-tight tracking-[-0.01em]">{title}</h3> : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {badge}
            <button type="button" onClick={onClose} className="sec-sheet-close" aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="command-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-6">{children}</div>
      </div>
    </div>
  );
}

export function SectionPanel({
  tone = "ink",
  children,
  className,
}: {
  tone?: MetroTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      style={toneVars(tone)}
      className={cn("glass-strong section-panel sec-panel rounded-lg p-4 sm:p-5 3xl:p-6", className)}
    >
      {children}
    </section>
  );
}

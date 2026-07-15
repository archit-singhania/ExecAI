"use client";

import { useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type MetroTone = "ink" | "midnight" | "cobalt" | "teal" | "plum" | "slate";

const TONE_CLASSES: Record<MetroTone, string> = {
  ink: "bg-gradient-to-br from-[#26303a] via-[#141a21] to-[#07090d] text-fog",
  midnight: "bg-gradient-to-br from-[#1c2948] via-[#10192e] to-[#070b15] text-fog",
  cobalt: "bg-gradient-to-br from-[#273d71] via-[#17274f] to-[#090e20] text-fog",
  teal: "bg-gradient-to-br from-[#123f47] via-[#0b2930] to-[#061316] text-fog",
  plum: "bg-gradient-to-br from-[#3c294c] via-[#251932] to-[#100a18] text-fog",
  slate: "bg-gradient-to-br from-[#455363] via-[#252f3b] to-[#0d1218] text-fog",
};

export const TONE_GLOW_HEX: Record<MetroTone, string> = {
  ink: "#8d9bae",
  midnight: "#668cff",
  cobalt: "#5e87e8",
  teal: "#47c6c2",
  plum: "#b184df",
  slate: "#9eafc0",
};

const TONE_CONTRAST_HEX: Record<MetroTone, string> = {
  ink: "#eef4ff",
  midnight: "#e8efff",
  cobalt: "#edf2ff",
  teal: "#e5fffc",
  plum: "#faefff",
  slate: "#edf5ff",
};

const TONE_PATTERN: Record<MetroTone, string> = {
  ink: "metro-tile-pattern-grid",
  midnight: "metro-tile-pattern-dots",
  cobalt: "metro-tile-pattern-diagonal",
  teal: "metro-tile-pattern-cross",
  plum: "metro-tile-pattern-dots",
  slate: "metro-tile-pattern-grid",
};

export type MetroTileSize = "1x1" | "wide" | "2x2";

const SIZE_CLASSES: Record<MetroTileSize, string> = {
  "1x1": "col-span-1 row-span-1 aspect-square",
  wide: "col-span-2 row-span-1 aspect-[2/1] sm:aspect-[2.1/1]",
  "2x2": "col-span-2 row-span-2 aspect-square",
};

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function MetroTile({
  label,
  stat,
  eyebrow,
  icon: Icon,
  tone = "ink",
  size = "1x1",
  onClick,
  className,
}: {
  label: string;
  stat?: string;
  eyebrow?: string;
  icon: React.ElementType;
  tone?: MetroTone;
  size?: MetroTileSize;
  onClick: () => void;
  className?: string;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const glow = TONE_GLOW_HEX[tone];
  const contrast = TONE_CONTRAST_HEX[tone];

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const surface = surfaceRef.current;
    if (!surface || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 16;
    const rotateX = (0.5 - py) * 16;
    surface.style.setProperty("--tile-tilt-x", `${rotateX}deg`);
    surface.style.setProperty("--tile-tilt-y", `${rotateY}deg`);
    event.currentTarget.style.setProperty("--spot-x", `${px * 100}%`);
    event.currentTarget.style.setProperty("--spot-y", `${py * 100}%`);
  }

  function handlePointerLeave(event: React.PointerEvent<HTMLButtonElement>) {
    const surface = surfaceRef.current;
    if (!surface) return;
    surface.style.setProperty("--tile-tilt-x", "0deg");
    surface.style.setProperty("--tile-tilt-y", "0deg");
    event.currentTarget.style.setProperty("--spot-x", "50%");
    event.currentTarget.style.setProperty("--spot-y", "50%");
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={
        {
          "--tile-glow": `0 0 18px 0px ${hexToRgba(glow, 0.28)}`,
          "--tile-glow-strong": `0 0 40px 3px ${hexToRgba(glow, 0.55)}`,
          "--tile-light": hexToRgba(glow, 0.72),
          "--tile-light-soft": hexToRgba(glow, 0.24),
          "--tile-contrast": TONE_CONTRAST_HEX[tone],
          "--tile-contrast-soft": hexToRgba(TONE_CONTRAST_HEX[tone], 0.28),
        } as React.CSSProperties
      }
      className={cn(
        "metro-tile group relative flex flex-col justify-between overflow-hidden p-3 text-left sm:p-4",
        SIZE_CLASSES[size],
        className,
      )}
    >
      <div
        ref={surfaceRef}
        className={cn("metro-tile-surface absolute inset-0", TONE_CLASSES[tone])}
      >
        <div className="metro-tile-aurora" />
        <div className="metro-tile-scan" />
        <div className="metro-tile-stage" aria-hidden="true">
          <div className="metro-tile-floor" />
          <div className="metro-tile-orbit metro-tile-orbit-a" />
          <div className="metro-tile-orbit metro-tile-orbit-b" />
          <div className="metro-tile-prism">
            <span className="metro-tile-prism-face metro-tile-prism-front" />
            <span className="metro-tile-prism-face metro-tile-prism-back" />
            <span className="metro-tile-prism-face metro-tile-prism-left" />
            <span className="metro-tile-prism-face metro-tile-prism-right" />
            <span className="metro-tile-prism-face metro-tile-prism-top" />
          </div>
        </div>
        <div className={cn("metro-tile-pattern", TONE_PATTERN[tone])} />
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{
            background: `radial-gradient(220px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgba(255,255,255,0.28), transparent 68%)`,
          }}
        />
        <div className="metro-tile-grain" />
        <div className="metro-tile-shimmer" />
      </div>

      <div
        className={cn(
          "metro-tile-content relative z-10 flex h-full flex-col justify-between",
          TONE_CLASSES[tone].includes("text-ink") ? "text-ink" : "text-fog",
        )}
        style={{ color: contrast }}
      >
        <div className="flex items-start justify-between">
          <div className="metro-tile-icon-shell">
            <Icon size={size === "2x2" ? 28 : 20} className="metro-tile-icon" />
          </div>
          <div className="metro-tile-state">
            <span className="metro-tile-pulse-dot h-1.5 w-1.5 rounded-full" style={{ background: "currentColor" }} />
            <span>{size === "2x2" ? "Primary" : "Ready"}</span>
          </div>
        </div>
        <div>
          <p className="metro-tile-eyebrow">{eyebrow ?? "Executive system"}</p>
          <div className="mt-1 flex items-end justify-between gap-2">
            <p className={cn("font-black leading-tight", size === "2x2" ? "text-lg sm:text-xl" : "text-xs sm:text-sm")}>{label}</p>
            <span className="metro-tile-action" aria-hidden="true"><ArrowUpRight size={size === "2x2" ? 18 : 15} /></span>
          </div>
          {stat ? <div className="metro-tile-reading"><span>{stat}</span><span className="metro-tile-reading-line" /></div> : null}
        </div>
      </div>
    </button>
  );
}

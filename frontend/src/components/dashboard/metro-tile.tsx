"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

export type MetroTone = "ink" | "accent" | "ember" | "basil" | "chartreuse" | "steel";

const TONE_CLASSES: Record<MetroTone, string> = {
  ink: "bg-gradient-to-br from-[#3d444e] via-[#1b1f24] to-[#050607] text-fog",
  accent: "bg-gradient-to-br from-[#f4fad0] via-[#c3d968] to-[#5c6d1e] text-ink",
  ember: "bg-gradient-to-br from-[#ffb493] via-[#e06e42] to-[#7a2405] text-fog",
  basil: "bg-gradient-to-br from-[#5fd9bd] via-[#159a80] to-[#052821] text-fog",
  chartreuse: "bg-gradient-to-br from-[#f6ffcf] via-[#c9dd6b] to-[#63701e] text-ink",
  steel: "bg-gradient-to-br from-[#c7d5dd] via-[#7c93a0] to-[#232e34] text-fog",
};

export const TONE_GLOW_HEX: Record<MetroTone, string> = {
  ink: "#5b6472",
  accent: "#c3d968",
  ember: "#e06e42",
  basil: "#159a80",
  chartreuse: "#c9dd6b",
  steel: "#7c93a0",
};

const TONE_PATTERN: Record<MetroTone, string> = {
  ink: "metro-tile-pattern-grid",
  accent: "metro-tile-pattern-dots",
  ember: "metro-tile-pattern-diagonal",
  basil: "metro-tile-pattern-cross",
  chartreuse: "metro-tile-pattern-dots",
  steel: "metro-tile-pattern-grid",
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
  icon: Icon,
  tone = "ink",
  size = "1x1",
  onClick,
  className,
}: {
  label: string;
  stat?: string;
  icon: React.ElementType;
  tone?: MetroTone;
  size?: MetroTileSize;
  onClick: () => void;
  className?: string;
}) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const glow = TONE_GLOW_HEX[tone];

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    const surface = surfaceRef.current;
    if (!surface || event.pointerType === "touch") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 16;
    const rotateX = (0.5 - py) * 16;
    surface.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(8px)`;
    event.currentTarget.style.setProperty("--spot-x", `${px * 100}%`);
    event.currentTarget.style.setProperty("--spot-y", `${py * 100}%`);
  }

  function handlePointerLeave(event: React.PointerEvent<HTMLButtonElement>) {
    const surface = surfaceRef.current;
    if (!surface) return;
    surface.style.transform = "rotateX(0deg) rotateY(0deg) translateZ(0px)";
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
          "relative z-10 flex h-full flex-col justify-between",
          TONE_CLASSES[tone].includes("text-ink") ? "text-ink" : "text-fog",
        )}
      >
        <div className="flex items-start justify-between">
          <Icon size={size === "2x2" ? 30 : 22} className="metro-tile-icon drop-shadow-sm" />
          <span
            className="metro-tile-pulse-dot h-1.5 w-1.5 rounded-full"
            style={{ background: "currentColor" }}
          />
        </div>
        <div>
          <p className={cn("font-black leading-tight drop-shadow-sm", size === "2x2" ? "text-lg sm:text-xl" : "text-xs sm:text-sm")}>
            {label}
          </p>
          {stat ? (
            <p className="mt-1 text-[0.7rem] font-bold uppercase tracking-wide opacity-85 sm:text-xs">{stat}</p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

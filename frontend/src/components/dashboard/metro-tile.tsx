"use client";

import { useCallback, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type MetroTone = "ink" | "midnight" | "cobalt" | "teal" | "plum" | "slate";
export type MetroTileSize = "1x1" | "wide" | "2x2";

const TONE_BG: Record<MetroTone, string> = {
  ink: "linear-gradient(145deg, #26303a 0%, #141a21 55%, #07090d 100%)",
  midnight: "linear-gradient(145deg, #1c2948 0%, #10192e 55%, #070b15 100%)",
  cobalt: "linear-gradient(145deg, #273d71 0%, #17274f 55%, #090e20 100%)",
  teal: "linear-gradient(145deg, #123f47 0%, #0b2930 55%, #061316 100%)",
  plum: "linear-gradient(145deg, #3c294c 0%, #251932 55%, #100a18 100%)",
  slate: "linear-gradient(145deg, #455363 0%, #252f3b 55%, #0d1218 100%)",
};

export const TONE_GLOW_HEX: Record<MetroTone, string> = {
  ink: "#8d9bae",
  midnight: "#668cff",
  cobalt: "#5e87e8",
  teal: "#47c6c2",
  plum: "#b184df",
  slate: "#9eafc0",
};

const SIZE_CLASSES: Record<MetroTileSize, string> = {
  "1x1": "col-span-1 row-span-1",
  wide: "col-span-2 row-span-1",
  "2x2": "col-span-2 row-span-2",
};

function rgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  return `rgba(${parseInt(clean.slice(0, 2), 16)}, ${parseInt(clean.slice(2, 4), 16)}, ${parseInt(
    clean.slice(4, 6),
    16,
  )}, ${alpha})`;
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null;

  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = max - min || 1;
  const step = 100 / (points.length - 1);

  const path = points
    .map((value, index) => `${index * step},${26 - ((value - min) / span) * 22}`)
    .join(" ");

  return (
    <svg viewBox="0 0 100 28" preserveAspectRatio="none" className="mt2-spark" aria-hidden="true">
      <polyline points={path} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
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
  trend,
  progress,
  delta,
  status = "Ready",
}: {
  label: string;
  stat?: string;
  eyebrow?: string;
  icon: React.ElementType;
  tone?: MetroTone;
  size?: MetroTileSize;
  onClick: () => void;
  className?: string;
  trend?: number[];
  progress?: number;
  delta?: string;
  status?: string;
}) {
  const frame = useRef<number | null>(null);
  const pending = useRef<{ x: number; y: number } | null>(null);
  const node = useRef<HTMLButtonElement>(null);

  const flush = useCallback(() => {
    frame.current = null;
    const next = pending.current;
    const element = node.current;
    if (!next || !element) return;

    element.style.setProperty("--sx", `${next.x}%`);
    element.style.setProperty("--sy", `${next.y}%`);
  }, []);

  const handleMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.pointerType === "touch") return;

      const rect = event.currentTarget.getBoundingClientRect();
      pending.current = {
        x: ((event.clientX - rect.left) / rect.width) * 100,
        y: ((event.clientY - rect.top) / rect.height) * 100,
      };

      if (frame.current === null) {
        frame.current = requestAnimationFrame(flush);
      }
    },
    [flush],
  );

  const handleLeave = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    pending.current = null;
    node.current?.style.setProperty("--sx", "50%");
    node.current?.style.setProperty("--sy", "50%");
  }, []);

  const glow = TONE_GLOW_HEX[tone];
  const large = size === "2x2";

  return (
    <button
      ref={node}
      type="button"
      onClick={onClick}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      style={
        {
          "--tile-bg": TONE_BG[tone],
          "--tile-glow": glow,
          "--tile-glow-12": rgba(glow, 0.12),
          "--tile-glow-45": rgba(glow, 0.45),
        } as React.CSSProperties
      }
      className={cn("mt2", SIZE_CLASSES[size], className)}
    >
      <span className="mt2-sheen" aria-hidden="true" />

      <span className="mt2-inner">
        <span className="mt2-head">
          <span className="mt2-icon">
            <Icon size={large ? 22 : 17} strokeWidth={1.9} />
          </span>
          <span className="mt2-status">
            <span className="mt2-dot" />
            {status}
          </span>
        </span>

        <span className="mt2-foot">
          {eyebrow ? <span className="mt2-eyebrow">{eyebrow}</span> : null}

          <span className="mt2-title-row">
            <span className={cn("mt2-title", large && "mt2-title-lg")}>{label}</span>
            <ArrowUpRight size={large ? 17 : 14} className="mt2-arrow" />
          </span>

          {stat ? (
            <span className="mt2-stat-row">
              <span className={cn("mt2-stat", large && "mt2-stat-lg")}>{stat}</span>
              {delta ? <span className="mt2-delta">{delta}</span> : null}
              {trend?.length ? <Sparkline points={trend} color={glow} /> : null}
            </span>
          ) : null}

          {typeof progress === "number" ? (
            <span className="mt2-bar">
              <span className="mt2-bar-fill" style={{ width: `${Math.max(2, Math.min(100, progress))}%` }} />
            </span>
          ) : null}
        </span>
      </span>

      <span className="mt2-edge" aria-hidden="true" />
    </button>
  );
}

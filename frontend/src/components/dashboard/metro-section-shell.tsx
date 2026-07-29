"use client";

import { ReactNode, useLayoutEffect, useRef } from "react";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { MetroTone, TONE_GLOW_HEX } from "@/components/dashboard/metro-tile";
import { CursorSpotlight } from "@/components/ui/cursor-spotlight";

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function MetroSectionShell({
  title,
  tone = "ink",
  booting,
  loading,
  hasSession,
  isDemo,
  error,
  originRect,
  onBoardReview,
  onBack,
  children,
}: {
  title: string;
  tone?: MetroTone;
  booting: boolean;
  loading: boolean;
  hasSession: boolean;
  isDemo?: boolean;
  error: string;
  originRect?: DOMRect | null;
  onBoardReview: () => void;
  onBack: () => void;
  children: ReactNode;
}) {
  const glow = TONE_GLOW_HEX[tone];
  const shellRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = shellRef.current;
    if (!node || !originRect) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const target = node.getBoundingClientRect();
    if (!target.width || !target.height) return;

    const scaleX = originRect.width / target.width;
    const scaleY = originRect.height / target.height;
    const translateX = originRect.left - target.left;
    const translateY = originRect.top - target.top;

    node.style.transformOrigin = "top left";
    node.style.transform = `translate(${translateX}px, ${translateY}px) scale(${scaleX}, ${scaleY})`;
    node.style.opacity = "0.55";
    node.style.transition = "none";

    const frame = requestAnimationFrame(() => {
      node.style.transition =
        "transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 300ms ease";
      node.style.transform = "none";
      node.style.opacity = "1";
    });

    const clear = window.setTimeout(() => {
      node.style.transition = "";
      node.style.transformOrigin = "";
    }, 500);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(clear);
    };
  }, [originRect]);

  return (
    <div
      ref={shellRef}
      className="metro-grid-fade relative flex h-full min-w-0 flex-1 flex-col gap-3 sm:gap-4"
      style={{
        "--tone-a": hexToRgba(glow, 0.22),
        "--tone-b": hexToRgba(glow, 0.14),
        "--tone-solid": glow,
      } as React.CSSProperties}
    >
      <div className="section-tone-wash" />
      <CursorSpotlight />

      <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-3 sm:gap-4">
        <DashboardTopbar
          title={title}
          tone={tone}
          booting={booting}
          loading={loading}
          hasSession={hasSession}
          isDemo={isDemo}
          onBoardReview={onBoardReview}
          onBack={onBack}
        />

        <div className="section-accent-bar shrink-0 rounded-full" />

        {error ? (
          <div className="glass shrink-0 rounded-md border border-ember/30 px-3 py-2 text-xs font-semibold text-ember">{error}</div>
        ) : null}

        <div className="command-scroll min-h-0 flex-1 overflow-y-auto rounded-lg">{children}</div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";

type VantaEffectInstance = { destroy: () => void };

function hexFromAccent(accent: string): number {
  const [r, g, b] = accent.split(" ").map((channel) => Number(channel.trim()) || 0);
  return (r << 16) + (g << 8) + b;
}

export function VantaNetworkBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<VantaEffectInstance | null>(null);
  const { mode, accent } = useTheme();
  const [reducedMotion, setReducedMotion] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const handleChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (reducedMotion || !containerRef.current) return;

    let cancelled = false;

    async function init() {
      const [THREE, { default: NET }] = await Promise.all([
        import("three"),
        import("vanta/dist/vanta.net.min"),
      ]);

      if (cancelled || !containerRef.current) return;

      effectRef.current = NET({
        el: containerRef.current,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.0,
        minWidth: 200.0,
        scale: 1.0,
        scaleMobile: 1.0,
        points: 8.0,
        maxDistance: 22.0,
        spacing: 20.0,
        showDots: true,
        backgroundAlpha: 0,
        color: hexFromAccent(accent),
        backgroundColor: mode === "dark" ? 0x0c0e11 : 0xf6f4ee,
      }) as VantaEffectInstance;
    }

    init();

    return () => {
      cancelled = true;
      effectRef.current?.destroy();
      effectRef.current = null;
    };
  }, [mode, accent, reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 opacity-[0.4] dark:opacity-[0.5]"
      aria-hidden
    />
  );
}

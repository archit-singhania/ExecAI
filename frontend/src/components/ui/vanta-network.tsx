"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";

type VantaEffectInstance = { destroy: () => void };

const NET_COLOR_LIGHT = 0x10131a; 
const NET_COLOR_DARK = 0xf2f4ff; 

export function VantaNetworkBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<VantaEffectInstance | null>(null);
  const threeModRef = useRef<typeof import("three") | null>(null);
  const netFactoryRef = useRef<((opts: Record<string, unknown>) => VantaEffectInstance) | null>(null);
  const { mode } = useTheme();
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(query.matches);
    const handleChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    query.addEventListener("change", handleChange);
    return () => query.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    const handleVisibility = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  useEffect(() => {
    if (reducedMotion || !visible || !containerRef.current) return;

    let cancelled = false;

    async function init() {
      if (!threeModRef.current || !netFactoryRef.current) {
        const [THREE, { default: NET }] = await Promise.all([
          import("three"),
          import("vanta/dist/vanta.net.min"),
        ]);
        threeModRef.current = THREE;
        netFactoryRef.current = NET as unknown as (opts: Record<string, unknown>) => VantaEffectInstance;
      }

      if (cancelled || !containerRef.current) return;

      effectRef.current = netFactoryRef.current({
        el: containerRef.current,
        THREE: threeModRef.current,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.0,
        minWidth: 200.0,
        scale: 1.0,
        scaleMobile: 1.0,
        points: 7.0,
        maxDistance: 18.0,
        spacing: 20.0,
        showDots: true,
        backgroundAlpha: 0,
        color: mode === "dark" ? NET_COLOR_DARK : NET_COLOR_LIGHT,
        backgroundColor: mode === "dark" ? 0x0c0e11 : 0xf6f4ee,
      });
    }

    init();

    return () => {
      cancelled = true;
      effectRef.current?.destroy();
      effectRef.current = null;
    };
  }, [mode, reducedMotion, visible]);

  if (reducedMotion) return null;

  return (
    <div
      ref={containerRef}
      className="pointer-events-none absolute inset-0 opacity-[0.55] dark:opacity-[0.6]"
      aria-hidden
    />
  );
}

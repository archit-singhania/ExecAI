"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/components/theme-provider";
import {
  AmbientState,
  getAmbient,
  healthColor,
  subscribeAmbient,
  subscribePulse,
} from "@/lib/ambient-state";
import { claimWebGL, releaseWebGL, webglBudget } from "@/lib/webgl-lock";

type VantaEffectInstance = {
  destroy: () => void;
  setOptions?: (opts: Record<string, unknown>) => void;
};

export function VantaNetworkBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<VantaEffectInstance | null>(null);
  const threeModRef = useRef<typeof import("three") | null>(null);
  const netFactoryRef = useRef<((opts: Record<string, unknown>) => VantaEffectInstance) | null>(null);
  const ambientRef = useRef<AmbientState>(getAmbient());
  const { mode } = useTheme();
  const [reducedMotion, setReducedMotion] = useState(true);
  const [visible, setVisible] = useState(true);
  const [pulsing, setPulsing] = useState(false);
  const [capable, setCapable] = useState(false);

  useEffect(() => {
    const budget = webglBudget();
    if (!budget.enabled) {
      setCapable(false);
      return;
    }

    const granted = claimWebGL("vanta-dashboard");
    setCapable(granted);
    return () => releaseWebGL("vanta-dashboard");
  }, []);

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
    return subscribeAmbient((state) => {
      const previous = ambientRef.current;
      ambientRef.current = state;

      const effect = effectRef.current;
      if (!effect || typeof effect.setOptions !== "function") return;
      if (previous.health === state.health) return;

      try {
        effect.setOptions({ color: healthColor(state.health, mode === "dark") });
      } catch {
      }
    });
  }, [mode]);

  useEffect(() => {
    return subscribePulse(() => {
      setPulsing(true);
      window.setTimeout(() => setPulsing(false), 620);
    });
  }, []);

  useEffect(() => {
    if (reducedMotion || !visible || !capable || !containerRef.current) return;

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
        mouseControls: false,
        touchControls: false,
        gyroControls: false,
        minHeight: 200.0,
        minWidth: 200.0,
        scale: 1.0,
        scaleMobile: 1.0,
        points: 5.0,
        maxDistance: 16.0,
        spacing: 24.0,
        showDots: true,
        backgroundAlpha: 0,
        color: healthColor(ambientRef.current.health, mode === "dark"),
        backgroundColor: mode === "dark" ? 0x0c0e11 : 0xf6f4ee,
      });
    }

    init();

    return () => {
      cancelled = true;
      effectRef.current?.destroy();
      effectRef.current = null;
    };
  }, [capable, mode, reducedMotion, visible]);

  if (reducedMotion || !capable) return null;

  return (
    <div
      ref={containerRef}
      className={`vanta-layer pointer-events-none absolute inset-0${pulsing ? " vanta-layer-pulse" : ""}`}
      aria-hidden
    />
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from its previous value to the next one.
 *
 * Pair this with `font-variant-numeric: tabular-nums` (applied globally to
 * metric classes in src/styles/premium.css) — without tabular figures the
 * element visibly reflows on every frame as digit widths change, which reads
 * as jitter rather than motion.
 *
 * Respects prefers-reduced-motion by snapping straight to the target.
 */
export function useCountUp(
  target: number,
  {
    duration = 900,
    decimals = 0,
    startOnMount = true,
  }: { duration?: number; decimals?: number; startOnMount?: boolean } = {},
) {
  const [value, setValue] = useState(() => (startOnMount ? 0 : target));
  const frame = useRef<number | null>(null);
  const from = useRef(startOnMount ? 0 : target);

  useEffect(() => {
    if (!Number.isFinite(target)) return;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || duration <= 0) {
      from.current = target;
      setValue(target);
      return;
    }

    const start = performance.now();
    const origin = from.current;
    const delta = target - origin;

    if (delta === 0) return;

    // Matches --e-out (expo-out) so numbers decelerate on the same curve as
    // every other entrance in the app.
    const ease = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const next = origin + delta * ease(progress);
      const factor = 10 ** decimals;

      setValue(Math.round(next * factor) / factor);

      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        from.current = target;
        frame.current = null;
      }
    }

    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      from.current = target;
    };
  }, [target, duration, decimals]);

  return value;
}

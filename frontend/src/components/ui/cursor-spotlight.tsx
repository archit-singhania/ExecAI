"use client";

import { useEffect, useRef } from "react";

export function CursorSpotlight() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let raf = 0;
    let pending: { x: number; y: number } | null = null;

    function apply() {
      raf = 0;
      if (!pending || !el) return;
      el.style.setProperty("--spot-x", `${pending.x}%`);
      el.style.setProperty("--spot-y", `${pending.y}%`);
    }

    function onMove(event: PointerEvent) {
      pending = {
        x: (event.clientX / window.innerWidth) * 100,
        y: (event.clientY / window.innerHeight) * 100,
      };
      if (!raf) raf = requestAnimationFrame(apply);
    }

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className="cursor-spotlight pointer-events-none absolute inset-0" aria-hidden />;
}

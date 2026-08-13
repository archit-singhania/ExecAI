"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Short tactile confirmations on mobile. No-ops where unsupported. */
export const haptics = {
  tap: () => navigator.vibrate?.(8),
  select: () => navigator.vibrate?.(12),
  success: () => navigator.vibrate?.([10, 40, 18]),
  warn: () => navigator.vibrate?.([24, 50, 24]),
  error: () => navigator.vibrate?.([40, 60, 40, 60, 40]),
};

/** Horizontal swipe on a card. Returns handlers plus live offset for feedback. */
export function useSwipe({
  onLeft,
  onRight,
  threshold = 72,
}: {
  onLeft?: () => void;
  onRight?: () => void;
  threshold?: number;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState(0);
  const [settling, setSettling] = useState(false);

  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (event.pointerType === "mouse") return;
    start.current = { x: event.clientX, y: event.clientY };
    setSettling(false);
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    if (!start.current) return;

    const dx = event.clientX - start.current.x;
    const dy = event.clientY - start.current.y;

    if (Math.abs(dy) > Math.abs(dx)) {
      start.current = null;
      setOffset(0);
      return;
    }

    setOffset(Math.max(-140, Math.min(140, dx)));
  }, []);

  const onPointerUp = useCallback(() => {
    if (!start.current) return;
    start.current = null;
    setSettling(true);

    if (offset <= -threshold) {
      haptics.select();
      onLeft?.();
    } else if (offset >= threshold) {
      haptics.select();
      onRight?.();
    }

    setOffset(0);
  }, [offset, onLeft, onRight, threshold]);

  return {
    offset,
    settling,
    swiping: offset !== 0,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}

/** Pull-to-refresh on a scroll container. Only engages at scrollTop 0. */
export function usePullToRefresh(onRefresh: () => Promise<void> | void, enabled = true) {
  const containerRef = useRef<HTMLElement | null>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const threshold = 72;

  useEffect(() => {
    const node = containerRef.current;
    if (!node || !enabled) return;

    function onStart(event: TouchEvent) {
      if (!node || node.scrollTop > 2 || refreshing) return;
      startY.current = event.touches[0].clientY;
    }

    function onMove(event: TouchEvent) {
      if (startY.current === null || !node) return;
      const delta = event.touches[0].clientY - startY.current;
      if (delta <= 0) {
        setPull(0);
        return;
      }
      setPull(Math.min(110, delta * 0.5));
    }

    async function onEnd() {
      if (startY.current === null) return;
      startY.current = null;

      if (pull >= threshold && !refreshing) {
        haptics.success();
        setRefreshing(true);
        setPull(threshold);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    }

    node.addEventListener("touchstart", onStart, { passive: true });
    node.addEventListener("touchmove", onMove, { passive: true });
    node.addEventListener("touchend", onEnd);

    return () => {
      node.removeEventListener("touchstart", onStart);
      node.removeEventListener("touchmove", onMove);
      node.removeEventListener("touchend", onEnd);
    };
  }, [enabled, onRefresh, pull, refreshing]);

  return { containerRef, pull, refreshing, ready: pull >= threshold };
}

/** Page scroll progress, 0–1, rAF-throttled. */
export function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    function measure() {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, window.scrollY / max) : 0);
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(measure);
    }

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return progress;
}

/** Blurs the page behind an open overlay, restoring on close. */
export function useDepthOfField(active: boolean) {
  useEffect(() => {
    const root = document.body;
    if (active) root.classList.add("dof-active");
    else root.classList.remove("dof-active");
    return () => root.classList.remove("dof-active");
  }, [active]);
}

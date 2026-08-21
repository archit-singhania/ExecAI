"use client";

import { useEffect, useRef } from "react";

/**
 * Roving tabindex for a 2-D grid of interactive tiles.
 *
 * Without this, the metro grid puts ten stops in the tab order before the user
 * reaches anything else. With it, the grid is a single stop and arrow keys move
 * within it — the behaviour a keyboard user expects from a grid.
 *
 * Usage:
 *   const gridRef = useRovingGrid<HTMLDivElement>("button.mt2", 4);
 *   <div ref={gridRef} role="grid" className="mh-grid">…</div>
 */
export function useRovingGrid<T extends HTMLElement>(
  itemSelector: string,
  columns: number,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    function items() {
      return Array.from(
        container!.querySelectorAll<HTMLElement>(itemSelector),
      ).filter((node) => node.offsetParent !== null);
    }

    function sync(activeIndex = 0) {
      items().forEach((node, index) => {
        node.tabIndex = index === activeIndex ? 0 : -1;
      });
    }

    sync();

    function onKeyDown(event: KeyboardEvent) {
      const nodes = items();
      const current = nodes.indexOf(document.activeElement as HTMLElement);
      if (current === -1) return;

      const moves: Record<string, number> = {
        ArrowRight: 1,
        ArrowLeft: -1,
        ArrowDown: columns,
        ArrowUp: -columns,
      };

      let next: number | null = null;

      if (event.key in moves) {
        next = current + moves[event.key];
      } else if (event.key === "Home") {
        next = 0;
      } else if (event.key === "End") {
        next = nodes.length - 1;
      }

      if (next === null) return;

      next = Math.max(0, Math.min(nodes.length - 1, next));
      if (next === current) return;

      event.preventDefault();
      nodes[next].focus();
      sync(next);
    }

    function onFocusIn(event: FocusEvent) {
      const nodes = items();
      const index = nodes.indexOf(event.target as HTMLElement);
      if (index !== -1) sync(index);
    }

    container.addEventListener("keydown", onKeyDown);
    container.addEventListener("focusin", onFocusIn);

    return () => {
      container.removeEventListener("keydown", onKeyDown);
      container.removeEventListener("focusin", onFocusIn);
    };
  }, [itemSelector, columns]);

  return ref;
}

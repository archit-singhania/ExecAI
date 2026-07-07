"use client";

import { MouseEvent, useCallback, useState } from "react";

type Ripple = { id: number; x: number; y: number; size: number };

let rippleId = 0;

export function useRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);

  const onMouseDown = useCallback((event: MouseEvent<HTMLElement>) => {
    const target = event.currentTarget;
    const rect = target.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 1.5;
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    const id = ++rippleId;
    setRipples((current) => [...current, { id, x, y, size }]);
    window.setTimeout(() => {
      setRipples((current) => current.filter((ripple) => ripple.id !== id));
    }, 640);
  }, []);

  return { ripples, onMouseDown };
}

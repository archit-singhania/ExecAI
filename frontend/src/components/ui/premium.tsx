"use client";

import { ReactNode, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

function useRafVars(apply: (element: HTMLElement, event: PointerEvent) => void) {
  const frame = useRef<number | null>(null);
  const pending = useRef<PointerEvent | null>(null);
  const node = useRef<HTMLElement | null>(null);

  const flush = useCallback(() => {
    frame.current = null;
    const event = pending.current;
    const element = node.current;
    if (event && element) apply(element, event);
  }, [apply]);

  const onMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (event.pointerType === "touch") return;
      node.current = event.currentTarget;
      pending.current = event.nativeEvent;
      if (frame.current === null) frame.current = requestAnimationFrame(flush);
    },
    [flush],
  );

  const cancel = useCallback(() => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current);
      frame.current = null;
    }
    pending.current = null;
  }, []);

  return { onMove, cancel, node };
}

export function Spotlight({
  children,
  className,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article";
}) {
  const { onMove, cancel, node } = useRafVars((element, event) => {
    const rect = element.getBoundingClientRect();
    element.style.setProperty("--spot-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    element.style.setProperty("--spot-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  });

  return (
    <Tag
      onPointerMove={onMove}
      onPointerLeave={() => {
        cancel();
        node.current?.style.setProperty("--spot-x", "50%");
        node.current?.style.setProperty("--spot-y", "50%");
      }}
      className={cn("spot", className)}
    >
      <span className="spot-glow" aria-hidden />
      <span className="spot-content">{children}</span>
    </Tag>
  );
}

export function Magnetic({
  children,
  strength = 6,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const { onMove, cancel, node } = useRafVars((element, event) => {
    const rect = element.getBoundingClientRect();
    const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    element.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
  });

  return (
    <span
      onPointerMove={onMove}
      onPointerLeave={() => {
        cancel();
        if (node.current) node.current.style.transform = "translate(0, 0)";
      }}
      className={cn("magnetic", className)}
    >
      {children}
    </span>
  );
}

export function GradientBorder({
  children,
  className,
  active = true,
}: {
  children: ReactNode;
  className?: string;
  active?: boolean;
}) {
  return (
    <div className={cn("gborder", active && "gborder-on", className)}>
      <span className="gborder-inner">{children}</span>
    </div>
  );
}

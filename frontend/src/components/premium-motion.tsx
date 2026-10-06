"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Animate the new content surface, preserving forms, focus and the navigation shell. */
export function PremiumMotion() {
  const pathname = usePathname();
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let animation: Animation | undefined;
    const reduced = () =>
      media.matches || document.documentElement.classList.contains("reduce-motion");
    const cancel = () => {
      if (reduced()) animation?.cancel();
    };
    const frame = requestAnimationFrame(() => {
      if (reduced()) return;
      const surface = document.querySelector<HTMLElement>(
        ".st-content, .material-hero, .sec-panel, main",
      );
      if (!surface?.animate) return;
      animation = surface.animate(
        [
          { opacity: 0.5, transform: "translateY(8px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 280, easing: "cubic-bezier(.22,1,.36,1)" },
      );
      surface.dataset.motionSurface = "executive";
    });
    const observer = new MutationObserver(cancel);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    media.addEventListener("change", cancel);
    return () => {
      cancelAnimationFrame(frame);
      animation?.cancel();
      observer.disconnect();
      media.removeEventListener("change", cancel);
    };
  }, [pathname]);
  return null;
}

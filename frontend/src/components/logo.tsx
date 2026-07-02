"use client";

import Image from "next/image";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function Logo({ size = 44 }: { size?: number }) {
  const { mode } = useTheme();

  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-lg shadow-glow ring-1 ring-ink/5 dark:ring-fog/10"
      style={{ height: size, width: size }}
    >
      {}
      <Image
        src="/LightModeLogo.png"
        alt="CEO.ai"
        fill
        sizes={`${size}px`}
        className={cn("object-cover transition-opacity duration-150", mode === "dark" ? "opacity-0" : "opacity-100")}
        priority
      />
      <Image
        src="/DarkModeLogo.png"
        alt=""
        aria-hidden
        fill
        sizes={`${size}px`}
        className={cn("object-cover transition-opacity duration-150", mode === "dark" ? "opacity-100" : "opacity-0")}
        priority
      />
      <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-chartreuse ring-4 ring-fog dark:ring-[#0c0e11]" />
    </div>
  );
}

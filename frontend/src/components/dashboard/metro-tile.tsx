"use client";

import { cn } from "@/lib/utils";

export type MetroTone = "ink" | "accent" | "ember" | "basil" | "chartreuse" | "steel";

const TONE_CLASSES: Record<MetroTone, string> = {
  ink: "bg-gradient-to-br from-[#2a2f37] via-ink to-[#0b0d10] text-fog",
  accent: "bg-gradient-to-br from-[#e2edb0] via-accent to-[#8a9c3f] text-ink",
  ember: "bg-gradient-to-br from-[#ed9a7c] via-ember to-[#9c3f1f] text-fog",
  basil: "bg-gradient-to-br from-[#39ab96] via-basil to-[#0c352c] text-fog",
  chartreuse: "bg-gradient-to-br from-[#e9f1c4] via-chartreuse to-[#8fa23f] text-ink",
  steel: "bg-gradient-to-br from-[#9dadb7] via-steel to-[#333f47] text-fog",
};

export type MetroTileSize = "1x1" | "wide" | "2x2";

const SIZE_CLASSES: Record<MetroTileSize, string> = {
  "1x1": "col-span-1 row-span-1 aspect-square",
  wide: "col-span-2 row-span-1 aspect-[2/1] sm:aspect-[2.1/1]",
  "2x2": "col-span-2 row-span-2 aspect-square",
};

export function MetroTile({
  label,
  stat,
  icon: Icon,
  tone = "ink",
  size = "1x1",
  onClick,
  className,
}: {
  label: string;
  stat?: string;
  icon: React.ElementType;
  tone?: MetroTone;
  size?: MetroTileSize;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "metro-tile group relative flex flex-col justify-between overflow-hidden p-3 text-left sm:p-4",
        TONE_CLASSES[tone],
        SIZE_CLASSES[size],
        className,
      )}
    >
      <div className="relative z-10 flex h-full flex-col justify-between">
        <Icon size={size === "2x2" ? 30 : 22} className="drop-shadow-sm" />
        <div>
          <p className={cn("font-black leading-tight drop-shadow-sm", size === "2x2" ? "text-lg sm:text-xl" : "text-xs sm:text-sm")}>
            {label}
          </p>
          {stat ? (
            <p className="mt-1 text-[0.7rem] font-bold uppercase tracking-wide opacity-85 sm:text-xs">{stat}</p>
          ) : null}
        </div>
      </div>
    </button>
  );
}

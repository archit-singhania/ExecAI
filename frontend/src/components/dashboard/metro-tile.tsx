"use client";

import { cn } from "@/lib/utils";

export type MetroTone = "ink" | "accent" | "ember" | "basil" | "chartreuse" | "steel";

const TONE_CLASSES: Record<MetroTone, string> = {
  ink: "bg-ink text-fog",
  accent: "bg-accent text-ink",
  ember: "bg-ember text-fog",
  basil: "bg-basil text-fog",
  chartreuse: "bg-chartreuse text-ink",
  steel: "bg-steel text-fog",
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
        "metro-tile group flex flex-col justify-between p-3 text-left sm:p-4",
        TONE_CLASSES[tone],
        SIZE_CLASSES[size],
        className,
      )}
    >
      <Icon size={size === "2x2" ? 30 : 22} className="opacity-90" />
      <div>
        <p className={cn("font-black leading-tight", size === "2x2" ? "text-lg sm:text-xl" : "text-xs sm:text-sm")}>
          {label}
        </p>
        {stat ? (
          <p className="mt-1 text-[0.7rem] font-bold uppercase tracking-wide opacity-75 sm:text-xs">{stat}</p>
        ) : null}
      </div>
    </button>
  );
}

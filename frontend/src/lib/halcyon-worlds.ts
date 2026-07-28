import { HalcyonWorldId } from "@/lib/halcyon-api";

export type WorldBaseline = {
  id: HalcyonWorldId;
  label: string;
  note: string;
  timeOfDay: number;
  warmth: number;
  fog: number;
  brightness: number;
  first?: boolean;
};

export const WORLD_BASELINES: WorldBaseline[] = [
  {
    id: "zen_garden",
    label: "Zen Garden",
    note: "Raked stone, koi, a waterfall you hear before you see",
    timeOfDay: 16.0, warmth: 0.55, fog: 0.15, brightness: 0.62, first: true,
  },
  {
    id: "ocean_dusk",
    label: "Ocean at Dusk",
    note: "Long tide, low sun, the shoreline going gold",
    timeOfDay: 19.2, warmth: 0.75, fog: 0.18, brightness: 0.5, first: true,
  },
  {
    id: "old_forest",
    label: "Old Forest",
    note: "Deep canopy, a stream off the path, fireflies after dark",
    timeOfDay: 10.5, warmth: 0.45, fog: 0.4, brightness: 0.45,
  },
  {
    id: "rain_cabin",
    label: "Rain Cabin",
    note: "Weather at the glass, a fire, nowhere else to be",
    timeOfDay: 20.5, warmth: 0.8, fog: 0.25, brightness: 0.35,
  },
  {
    id: "nordic_lake",
    label: "Nordic Lake",
    note: "Flat water, far mountains, air that carries sound",
    timeOfDay: 5.5, warmth: 0.4, fog: 0.45, brightness: 0.5,
  },
  {
    id: "blossom_park",
    label: "Blossom Park",
    note: "Petals moving without wind, benches, long avenues",
    timeOfDay: 15.0, warmth: 0.65, fog: 0.1, brightness: 0.7,
  },
  {
    id: "desert_oasis",
    label: "Desert Oasis",
    note: "Heat easing off the rock, palms, water in an impossible place",
    timeOfDay: 18.0, warmth: 0.85, fog: 0.08, brightness: 0.6,
  },
  {
    id: "observatory",
    label: "Observatory",
    note: "A dome open to the sky and the whole quiet weight of it",
    timeOfDay: 23.0, warmth: 0.3, fog: 0.12, brightness: 0.2,
  },
];

function hsl(h: number, s: number, l: number): string {
  return `hsl(${Math.round(h)} ${Math.round(s)}% ${Math.round(l)}%)`;
}

function skyHue(hour: number): number {
  if (hour < 5) return 232;
  if (hour < 7) return 268 - (hour - 5) * 24;  
  if (hour < 9) return 210;
  if (hour < 16) return 205;
  if (hour < 19) return 30 + (19 - hour) * 12;  
  if (hour < 21) return 22;
  return 232;
}

function daylight(hour: number): number {
  if (hour >= 7 && hour <= 17) return 1;
  if (hour >= 5 && hour < 7) return (hour - 5) / 2;
  if (hour > 17 && hour <= 20) return 1 - (hour - 17) / 3;
  return 0;
}

export function worldGradient(world: WorldBaseline): string {
  const light = daylight(world.timeOfDay);
  const hue = skyHue(world.timeOfDay);

  // Warmth pulls hue toward amber and lifts saturation, matching the
  // 8500K → 2400K sweep the Sky Director applies to the sun.
  const warmPull = world.warmth * 34;
  const topHue = hue > 180 ? hue - warmPull : hue + warmPull * 0.3;

  // Fog desaturates and lightens, exactly as it does in scene.
  const sat = (26 + light * 34) * (1 - world.fog * 0.45);
  const topLight = 6 + light * 30 * world.brightness + world.fog * 10;
  const bottomLight = topLight + 10 + world.warmth * 14;

  const bottomHue = topHue > 180 ? topHue - 22 : topHue + 14;

  return `linear-gradient(170deg, ${hsl(topHue, sat, topLight)} 0%, ${hsl(
    bottomHue,
    sat * 1.15,
    bottomLight,
  )} 100%)`;
}

export function formatHour(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

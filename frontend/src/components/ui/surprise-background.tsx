"use client";

import { useEffect, useState } from "react";
import { VantaNetworkBackground } from "@/components/ui/vanta-network";
import { SceneField, SceneVariant } from "@/components/ui/scene-field";

const SESSION_KEY = "ceoai-scene-pick";

export function SurpriseBackground({
  pool,
  className = "",
  reactive = false,
}: {
  pool: (SceneVariant | "vanta")[];
  className?: string;
  reactive?: boolean;
}) {
  const [pick, setPick] = useState<SceneVariant | "vanta" | null>(null);

  useEffect(() => {
    const stored = window.sessionStorage.getItem(SESSION_KEY);

    if (stored && pool.includes(stored as SceneVariant | "vanta")) {
      setPick(stored as SceneVariant | "vanta");
      return;
    }

    const chosen = pool[Math.floor(Math.random() * pool.length)];
    window.sessionStorage.setItem(SESSION_KEY, chosen);
    setPick(chosen);
  }, [pool]);

  if (!pick) return null;
  if (pick === "vanta") return <VantaNetworkBackground />;

  return <SceneField id="surprise" variant={pick} className={className} reactive={reactive} />;
}

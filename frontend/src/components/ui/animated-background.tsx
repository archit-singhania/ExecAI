"use client";

import { VantaNetworkBackground } from "@/components/ui/vanta-network";
import { CornerAccents } from "@/components/ui/corner-accents";

export function AnimatedBackground() {
  return (
    <>
      <div className="top-beam" aria-hidden />
      <div className="bottom-beam" aria-hidden />
      <div className="ambient-orbs" aria-hidden>
        <span className="orb orb-1" />
        <span className="orb orb-2" />
      </div>
      <VantaNetworkBackground />
      <CornerAccents />
    </>
  );
}

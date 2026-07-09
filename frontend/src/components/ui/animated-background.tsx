import { ParticleFieldBackground } from "@/components/ui/particle-field-background";
import { VantaNetworkBackground } from "@/components/ui/vanta-network";
import { NetworkBackground } from "@/components/ui/network-background";
import { CursorSpotlight } from "@/components/ui/cursor-spotlight";
import { CornerAccents } from "@/components/ui/corner-accents";

export function AnimatedBackground() {
  return (
    <>
      <div className="top-beam" aria-hidden />
      <div className="bottom-beam" aria-hidden />
      <div className="ambient-orbs" aria-hidden>
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
        <span className="orb orb-4" />
        <span className="grain" />
      </div>
      <VantaNetworkBackground />
      <ParticleFieldBackground />
      <NetworkBackground />
      <CursorSpotlight />
      <CornerAccents />
    </>
  );
}

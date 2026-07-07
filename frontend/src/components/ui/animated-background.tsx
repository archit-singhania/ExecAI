import { ParticleFieldBackground } from "@/components/ui/particle-field-background";
import { VantaNetworkBackground } from "@/components/ui/vanta-network";

export function AnimatedBackground() {
  return (
    <>
      <div className="ambient-orbs" aria-hidden>
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
        <span className="grain" />
      </div>
      <VantaNetworkBackground />
      <ParticleFieldBackground />
    </>
  );
}

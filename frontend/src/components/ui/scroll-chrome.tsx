"use client";

import { useEffect, useState } from "react";
import { useScrollProgress } from "@/lib/use-interactions";
import { cn } from "@/lib/utils";

export function ScrollProgress({ className }: { className?: string }) {
  const progress = useScrollProgress();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(progress > 0.01);
  }, [progress]);

  return (
    <div className={cn("scrollbar-track", visible && "scrollbar-track-on", className)} aria-hidden>
      <span className="scrollbar-fill" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}

export function MeshDivider({ flip = false }: { flip?: boolean }) {
  return (
    <div className={cn("mesh-divider", flip && "mesh-divider-flip")} aria-hidden>
      <span className="mesh-blob mesh-blob-1" />
      <span className="mesh-blob mesh-blob-2" />
      <span className="mesh-blob mesh-blob-3" />
    </div>
  );
}

export function PullIndicator({
  pull,
  ready,
  refreshing,
}: {
  pull: number;
  ready: boolean;
  refreshing: boolean;
}) {
  if (pull <= 0 && !refreshing) return null;

  return (
    <div className="ptr" style={{ height: pull }} aria-hidden>
      <span className={cn("ptr-ring", (ready || refreshing) && "ptr-ring-on", refreshing && "ptr-spin")}>
        <span className="ptr-dot" />
      </span>
      <span className="ptr-label">
        {refreshing ? "Refreshing" : ready ? "Release to refresh" : "Pull to refresh"}
      </span>
    </div>
  );
}

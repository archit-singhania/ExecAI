let holder: string | null = null;
const waiting = new Set<() => void>();

export function claimWebGL(id: string): boolean {
  if (holder === null) {
    holder = id;
    return true;
  }
  return holder === id;
}

export function releaseWebGL(id: string) {
  if (holder !== id) return;
  holder = null;
  const next = Array.from(waiting);
  waiting.clear();
  next.forEach((notify) => notify());
}

export function onWebGLFreed(notify: () => void): () => void {
  waiting.add(notify);
  return () => waiting.delete(notify);
}

export function webglBudget(): { enabled: boolean; tier: "high" | "medium" | "off" } {
  if (typeof window === "undefined") return { enabled: false, tier: "off" };

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return { enabled: false, tier: "off" };
  }

  const cores = navigator.hardwareConcurrency ?? 4;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4;

  if (coarse || cores < 4 || memory < 4 || window.innerWidth < 900) {
    return { enabled: false, tier: "off" };
  }

  if (cores >= 8 && memory >= 8) return { enabled: true, tier: "high" };
  return { enabled: true, tier: "medium" };
}

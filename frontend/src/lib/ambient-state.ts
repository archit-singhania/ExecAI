export type AmbientState = {
  health: number;
  filed: number;
  total: number;
  active: boolean;
};

const initial: AmbientState = { health: 82, filed: 0, total: 9, active: false };

let current: AmbientState = { ...initial };
const listeners = new Set<(state: AmbientState) => void>();
const pulseListeners = new Set<() => void>();

export function getAmbient(): AmbientState {
  return current;
}

export function setAmbient(patch: Partial<AmbientState>) {
  const next = { ...current, ...patch };

  const unchanged =
    next.health === current.health &&
    next.filed === current.filed &&
    next.total === current.total &&
    next.active === current.active;

  if (unchanged) return;

  current = next;
  listeners.forEach((listener) => listener(current));
}

export function resetAmbient() {
  setAmbient({ filed: 0, active: false });
}

export function subscribeAmbient(listener: (state: AmbientState) => void): () => void {
  listeners.add(listener);
  listener(current);
  return () => listeners.delete(listener);
}

export function pulseAmbient() {
  pulseListeners.forEach((listener) => listener());
}

export function subscribePulse(listener: () => void): () => void {
  pulseListeners.add(listener);
  return () => pulseListeners.delete(listener);
}

export function healthColor(health: number, dark: boolean): number {
  if (health >= 80) return dark ? 0x5fc8bd : 0x1d6f5f;
  if (health >= 65) return dark ? 0x7fa6f0 : 0x3d5fa8;
  if (health >= 50) return dark ? 0xd8c26a : 0x8a7420;
  return dark ? 0xe08a68 : 0xa8442a;
}

export type ToastTone = "info" | "success" | "error" | "upgrade";

export type Toast = {
  id: string;
  tone: ToastTone;
  title: string;
  detail?: string;
  actionLabel?: string;
  actionHref?: string;
  duration: number;
};

type Listener = (toasts: Toast[]) => void;

let toasts: Toast[] = [];
const listeners = new Set<Listener>();
const timers = new Map<string, number>();

function emit() {
  listeners.forEach((listener) => listener(toasts));
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => listeners.delete(listener);
}

export function dismissToast(id: string) {
  const timer = timers.get(id);
  if (timer) {
    window.clearTimeout(timer);
    timers.delete(id);
  }
  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

function push(toast: Omit<Toast, "id">) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const next: Toast = { ...toast, id };

  toasts = [...toasts, next].slice(-4);
  emit();

  if (next.duration > 0 && typeof window !== "undefined") {
    timers.set(id, window.setTimeout(() => dismissToast(id), next.duration));
  }

  return id;
}

export const toast = {
  info: (title: string, detail?: string) => push({ tone: "info", title, detail, duration: 4500 }),
  success: (title: string, detail?: string) => push({ tone: "success", title, detail, duration: 3500 }),
  error: (title: string, detail?: string) => push({ tone: "error", title, detail, duration: 7000 }),
  upgrade: (title: string, detail?: string) =>
    push({
      tone: "upgrade",
      title,
      detail,
      actionLabel: "See plans",
      actionHref: "/pricing",
      duration: 0,
    }),
};

export function toastFromError(error: unknown, fallback = "Something went wrong.") {
  const message = error instanceof Error ? error.message : fallback;

  const looksLikeQuota =
    /upgrade|plan allows|available on Pro|board runs|active session/i.test(message);

  if (looksLikeQuota) {
    return toast.upgrade("You've hit a plan limit", message);
  }

  return toast.error(fallback === message ? "Something went wrong" : fallback, message);
}

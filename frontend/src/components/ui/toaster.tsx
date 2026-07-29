"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Check, Info, Sparkles, X } from "lucide-react";
import { dismissToast, subscribeToasts, Toast, ToastTone } from "@/lib/toast";

const ICONS: Record<ToastTone, React.ElementType> = {
  info: Info,
  success: Check,
  error: AlertTriangle,
  upgrade: Sparkles,
};

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([]);

  useEffect(() => subscribeToasts(setItems), []);

  if (!items.length) return null;

  return (
    <div className="toaster" role="region" aria-label="Notifications">
      {items.map((item) => {
        const Icon = ICONS[item.tone];

        return (
          <div key={item.id} className={`toast toast-${item.tone}`} role="status" aria-live="polite">
            <span className="toast-icon">
              <Icon size={15} strokeWidth={2.1} />
            </span>

            <div className="toast-body">
              <p className="toast-title">{item.title}</p>
              {item.detail ? <p className="toast-detail">{item.detail}</p> : null}

              {item.actionLabel && item.actionHref ? (
                <Link href={item.actionHref} className="toast-action" onClick={() => dismissToast(item.id)}>
                  {item.actionLabel}
                  <ArrowUpRight size={12} />
                </Link>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => dismissToast(item.id)}
              aria-label="Dismiss"
              className="toast-close"
            >
              <X size={13} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

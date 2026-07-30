"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const TIER_LABEL: Record<string, string> = {
  pro: "Pro",
  team: "Team",
  agency: "Agency",
};

const TIER_PRICE: Record<string, string> = {
  pro: "€4.99",
  team: "€9.99",
  agency: "€14.99",
};

export function FeatureLock({
  unlocked,
  tier,
  title,
  body,
  compact = false,
  children,
}: {
  unlocked: boolean;
  tier: "pro" | "team" | "agency";
  title: string;
  body: string;
  compact?: boolean;
  children: ReactNode;
}) {
  if (unlocked) return <>{children}</>;

  return (
    <div className={cn("lock-root", compact && "lock-root-compact")}>
      <div className="lock-content" aria-hidden>
        {children}
      </div>

      <div className="lock-veil">
        <div className="lock-card">
          <span className="lock-badge">
            <Lock size={11} />
            {TIER_LABEL[tier]}
          </span>

          <p className="lock-title">{title}</p>
          {!compact ? <p className="lock-body">{body}</p> : null}

          <Link href="/pricing" className="lock-cta">
            Unlock for {TIER_PRICE[tier]}
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function LockedInline({
  tier,
  label,
}: {
  tier: "pro" | "team" | "agency";
  label: string;
}) {
  return (
    <Link href="/pricing" className="lock-inline" title={`${label} is available on ${TIER_LABEL[tier]}`}>
      <Lock size={11} />
      {label}
      <span className="lock-inline-tier">{TIER_LABEL[tier]}</span>
    </Link>
  );
}

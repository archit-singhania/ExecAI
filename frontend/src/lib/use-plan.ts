"use client";

import { useEffect, useState } from "react";
import { billingApi, Subscription } from "@/lib/billing";
import { getToken } from "@/lib/auth";

export type PlanFeatures = {
  tier: string;
  name: string;
  loading: boolean;
  scheduledReviews: boolean;
  exports: boolean;
  shareLinks: boolean;
  workspaces: boolean;
  whiteLabel: boolean;
  apiAccess: boolean;
  allAgents: boolean;
  runsUsed: number;
  runsIncluded: number;
  runsRemaining: number;
  nearLimit: boolean;
  subscription: Subscription | null;
  refresh: () => void;
};

const TIER_RANK: Record<string, number> = { free: 0, pro: 1, team: 2, agency: 3 };

export function usePlan(isDemo = false): PlanFeatures {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (isDemo || !getToken()) {
      setLoading(false);
      return;
    }

    let active = true;

    billingApi
      .me()
      .then((result) => {
        if (active) setSubscription(result);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isDemo, nonce]);

  const tier = isDemo ? "free" : subscription?.tier ?? "free";
  const rank = TIER_RANK[tier] ?? 0;

  const runsUsed = subscription?.runs_used ?? 0;
  const runsIncluded = subscription?.runs_included ?? 20;
  const runsRemaining = Math.max(0, runsIncluded - runsUsed);

  return {
    tier,
    name: subscription?.name ?? (isDemo ? "Trial" : "Free"),
    loading,
    scheduledReviews: rank >= 1,
    exports: rank >= 1,
    shareLinks: rank >= 1,
    workspaces: rank >= 2,
    whiteLabel: rank >= 3,
    apiAccess: rank >= 3,
    allAgents: rank >= 1,
    runsUsed,
    runsIncluded,
    runsRemaining,
    nearLimit: runsIncluded > 0 && runsRemaining <= Math.max(2, runsIncluded * 0.15),
    subscription,
    refresh: () => setNonce((value) => value + 1),
  };
}

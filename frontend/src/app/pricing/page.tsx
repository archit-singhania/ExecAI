"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { billingApi, Plan } from "@/lib/billing";
import { getToken } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { SceneStack } from "@/components/ui/scene-stack";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function PricingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [busyTier, setBusyTier] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    billingApi
      .plans()
      .then((result) => setPlans(result.plans))
      .catch(() =>
        setError("Couldn't load pricing. The backend may not be running."),
      )
      .finally(() => setLoaded(true));

    if (getToken()) {
      billingApi
        .me()
        .then((subscription) => setCurrentTier(subscription.tier))
        .catch(() => undefined);
    }
  }, []);

  async function choose(tier: string) {
    if (tier === "free") return;

    if (!getToken()) {
      window.location.href = `/signup?plan=${tier}`;
      return;
    }

    setBusyTier(tier);
    setError("");
    try {
      const { url } = await billingApi.checkout(tier);
      if (url) window.location.href = url;
      else setError("Checkout is unavailable right now.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't start checkout.");
    } finally {
      setBusyTier(null);
    }
  }

  return (
    <main
      id="main"
      className="relative min-h-[100dvh] overflow-hidden bg-radial-ui px-5 py-10 text-ink sm:px-8"
    >
      <SceneStack
        id="pricing"
        layers={["volumetric", "ribbons", "grid", "constellation"]}
        intensity={0.85}
      />

      <div className="relative mx-auto w-full max-w-[1100px]">
        <nav className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-steel transition-colors duration-fast ease-out hover:text-ink"
          >
            <ArrowLeft size={15} strokeWidth={1.75} />
            Back
          </Link>
          <Logo size={30} />
        </nav>

        <header className="mx-auto mt-14 max-w-2xl text-center">
          <p className="sec-eyebrow">Pricing</p>
          <h1 className="mt-4 font-display text-3xl tracking-tightest sm:text-4xl">
            A board that meets whether you show up or not.
          </h1>
          <p className="ui-card-desc mt-4 text-base">
            Every plan includes the conviction spread, so you always see where
            your specialists disagree. Cancel any time.
          </p>
          <p className="mx-auto mt-3 max-w-md text-xs text-steel/80">
            Prices are per account, not per seat. A board run is one question put
            to all nine specialists.
          </p>
        </header>

        {error ? (
          <p
            role="alert"
            className="mx-auto mt-8 max-w-md rounded-md bg-critical/10 px-4 py-3 text-center text-xs font-bold text-critical"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-stagger>
          {!loaded
            ? Array.from({ length: 4 }).map((_, index) => (
                <Card
                  key={index}
                  pad="lg"
                  style={{ "--i": index } as React.CSSProperties}
                >
                  <Skeleton className="h-3 w-16 rounded-full" />
                  <Skeleton className="mt-4 h-9 w-24" />
                  <Skeleton className="mt-6 h-11 w-full" />
                  <div className="mt-6 space-y-2.5">
                    {Array.from({ length: 5 }).map((_, line) => (
                      <Skeleton key={line} className="h-2.5 w-full rounded-full" />
                    ))}
                  </div>
                </Card>
              ))
            : plans.map((plan, index) => {
                const isCurrent = currentTier === plan.id;
                const featured = plan.id === "pro";

                return (
                  <Card
                    key={plan.id}
                    pad="lg"
                    elev={featured ? 3 : 2}
                    className={cn("relative", featured && "ring-1 ring-accent/30")}
                    style={{ "--i": index } as React.CSSProperties}
                  >
                    {featured ? (
                      <div className="absolute -top-2.5 left-6">
                        <Badge tone="accent">Most popular</Badge>
                      </div>
                    ) : null}

                    <p className="text-xs font-bold uppercase tracking-widest text-steel">
                      {plan.name}
                    </p>
                    <p className="ui-card-desc mt-1 min-h-[2.6em]">{plan.tagline}</p>

                    <p className="mt-4 font-display text-3xl tracking-tightest tabular">
                      <span className="align-super text-lg text-steel">€</span>
                      {plan.price_eur.toFixed(2)}
                      <span className="ml-1 text-sm font-semibold text-steel">
                        /mo
                      </span>
                    </p>

                    <Button
                      variant={featured ? "primary" : "ghost"}
                      onClick={() => choose(plan.id)}
                      disabled={isCurrent || busyTier === plan.id}
                      className="mt-5 w-full"
                    >
                      {busyTier === plan.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : null}
                      {isCurrent
                        ? "Your plan"
                        : plan.id === "free"
                          ? "Start free"
                          : `Choose ${plan.name}`}
                    </Button>

                    <ul className="mt-6 space-y-2.5">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check
                            size={13}
                            strokeWidth={2.5}
                            className="mt-1 shrink-0 text-positive"
                          />
                          <span className="text-sm leading-relaxed">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                );
              })}
        </div>

        <p className="mt-10 text-center text-xs text-steel">
          Prices in EUR, billed monthly. Board runs reset every 30 days.
        </p>
      </div>
    </main>
  );
}

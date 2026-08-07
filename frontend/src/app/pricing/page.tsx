"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { billingApi, Plan } from "@/lib/billing";
import { getToken } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { HeroField } from "@/components/ui/hero-field";
import { SceneField } from "@/components/ui/scene-field";
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
      .catch(() => setError("Couldn't load pricing. The backend may not be running."))
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
    <main className="relative min-h-[100dvh] overflow-hidden bg-radial-ui px-5 py-10 text-ink sm:px-8">
      <SceneField id="pricing" variant="ribbons" className="opacity-70" />
      <div className="relative mx-auto w-full max-w-[1100px]">
        <nav className="flex items-center justify-between gap-3">
          <Link href="/" className="inline-flex items-center gap-2 text-[0.8rem] font-bold text-steel hover:text-ink dark:hover:text-fog">
            <ArrowLeft size={15} />
            Back
          </Link>
          <Logo size={30} />
        </nav>

        <header className="mx-auto mt-14 max-w-2xl text-center">
          <p className="sec-eyebrow">Pricing</p>
          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-[-0.025em] sm:text-4xl">
            A board that meets whether you show up or not.
          </h1>
          <p className="mt-4 text-[0.95rem] font-medium leading-8 text-steel">
            Every plan includes the conviction spread, so you always see where your specialists
            disagree. Cancel any time.
          </p>
        </header>

        {error ? (
          <p className="mx-auto mt-8 max-w-md rounded-md bg-ember/10 px-4 py-3 text-center text-[0.8rem] font-bold text-ember">
            {error}
          </p>
        ) : null}

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {!loaded
            ? Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="pr-card">
                  <div className="sec-skel h-3 w-16 rounded-full" />
                  <div className="sec-skel mt-4 h-9 w-24 rounded-md" />
                  <div className="sec-skel mt-6 h-2.5 w-full rounded-full" />
                  <div className="sec-skel mt-2 h-2.5 w-4/5 rounded-full" />
                </div>
              ))
            : plans.map((plan) => {
                const isCurrent = currentTier === plan.id;
                const featured = plan.id === "pro";

                return (
                  <div key={plan.id} className={cn("pr-card", featured && "pr-card-featured")}>
                    {featured ? <span className="pr-flag">Most popular</span> : null}

                    <p className="pr-name">{plan.name}</p>
                    <p className="pr-tagline">{plan.tagline}</p>

                    <p className="pr-price">
                      <span className="pr-currency">€</span>
                      {plan.price_eur.toFixed(2)}
                      <span className="pr-period">/mo</span>
                    </p>

                    <button
                      type="button"
                      onClick={() => choose(plan.id)}
                      disabled={isCurrent || busyTier === plan.id}
                      className={cn("pr-cta", featured && "pr-cta-featured")}
                    >
                      {busyTier === plan.id ? <Loader2 size={14} className="animate-spin" /> : null}
                      {isCurrent ? "Your plan" : plan.id === "free" ? "Start free" : `Choose ${plan.name}`}
                    </button>

                    <ul className="pr-features">
                      {plan.features.map((feature) => (
                        <li key={feature}>
                          <Check size={13} className="pr-check" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
        </div>

        <p className="mt-10 text-center text-[0.78rem] font-medium leading-7 text-steel">
          Prices in EUR, billed monthly. Board runs reset every 30 days.
        </p>
      </div>
    </main>
  );
}

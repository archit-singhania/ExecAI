"use client";

import Link from "next/link";
import { ArrowRight, Radio, ShieldCheck, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { AgentPreviewCard } from "@/components/marketing/agent-preview-card";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { agentMeta } from "@/lib/dashboard-data";
import { useLocale } from "@/lib/i18n";

const FEATURED_AGENTS: Array<{ name: keyof typeof agentMeta; pitch: string }> = [
  {
    name: "Market Research",
    pitch: "Pressure-tests demand before you spend a cent building.",
  },
  {
    name: "CFO",
    pitch: "Caps validation spend and tracks runway against every decision.",
  },
  {
    name: "CTO",
    pitch: "Scopes the narrowest build that still proves repeat value.",
  },
  {
    name: "Sales",
    pitch: "Builds the pilot list and chases willingness to pay.",
  },
];

export default function LandingPage() {
  const { t } = useLocale();

  return (
    <main className="relative flex h-[100dvh] min-h-[640px] flex-col overflow-y-auto overflow-x-hidden bg-radial-ui text-ink">
      <div className="ambient-grid absolute inset-0" />
      <div className="scanline pointer-events-none absolute inset-0" />
      <AnimatedBackground />

      <div className="relative flex min-h-full flex-col">
        <MarketingNav />

        <section className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 items-center gap-6 px-4 pb-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-8">
          <div className="animate-rise flex flex-col gap-5">
            <div className="inline-flex w-fit items-center gap-2 rounded-md border border-ink/10 bg-white/70 px-3 py-1.5 text-[0.7rem] font-black shadow-line dark:border-fog/10 dark:bg-white/5 dark:shadow-line-dark sm:text-xs">
              {t("hero.badge")}
            </div>

            <h1 className="max-w-xl text-[2.15rem] font-black leading-[1.02] sm:text-5xl lg:text-[3.1rem]">
              {t("hero.title")}
            </h1>

            <p className="max-w-lg text-sm leading-6 text-steel sm:text-base sm:leading-7">{t("hero.subtitle")}</p>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/signup">
                <Button className="h-12 px-6">
                  {t("hero.ctaPrimary")} <ArrowRight size={17} />
                </Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost" className="h-12 px-6">
                  {t("hero.ctaSecondary")}
                </Button>
              </Link>
              <Link href="/trial">
                <Button variant="quiet" className="h-12 px-6">
                  <Sparkles size={16} />
                  {t("hero.ctaTertiary")}
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <StatusPill icon={Radio} label="Live system" pulse />
              <StatusPill icon={ShieldCheck} label="Human approval mode" />
              <StatusPill icon={Volume2} label="Board review" />
            </div>
          </div>

          <div className="animate-rise flex flex-col gap-3" style={{ animationDelay: "80ms" }}>
            <p className="text-[0.7rem] font-black uppercase tracking-wide text-steel sm:text-xs">
              {t("hero.specialists")}
            </p>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {FEATURED_AGENTS.map((agent) => {
                const meta = agentMeta[agent.name];
                return (
                  <AgentPreviewCard
                    key={agent.name}
                    icon={meta.icon}
                    name={agent.name}
                    orbit={meta.orbit}
                    tone={meta.tone}
                    pitch={agent.pitch}
                  />
                );
              })}
            </div>
            <p className="text-[0.7rem] text-steel sm:text-xs">{t("hero.specialistsNote")}</p>
          </div>
        </section>

        <footer className="shrink-0 px-4 pb-4 text-center text-[0.65rem] text-steel sm:px-6 sm:text-xs">
          {t("hero.footerNote")}
        </footer>
      </div>
    </main>
  );
}

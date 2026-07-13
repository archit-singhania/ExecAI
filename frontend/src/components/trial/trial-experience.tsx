"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { StatusPill } from "@/components/ui/status-pill";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { trialSuggestions } from "@/lib/trial-suggestions";
import { AgentReport } from "@/lib/api";
import { VoiceStage, VoiceStageHandle } from "@/components/voice/voice-stage";

const DEMO_REPLY =
  "Here's how the boardroom would open this up: Market Research would pressure-test demand with real interviews before any build, CFO would cap validation spend and track runway, and CTO would scope the narrowest workflow that still proves repeat value. Sign up free to run this for real, with memory, tasks, and weekly board reviews.";

const DEMO_REPORTS: AgentReport[] = [
  {
    agent: "Market Research",
    title: "Demand looks real, but the niche needs sharpening",
    summary: "Start with one painful, frequent workflow for one segment before automating anything broad.",
    bullets: ["Interview users already paying with time or money.", "Reject broad markets until there's a sharper wedge."],
    score: 84,
  },
  {
    agent: "CFO",
    title: "Keep first validation under $2,500",
    summary: "Spend only on interviews, a landing page test, and one paid channel experiment before building.",
    bullets: ["Cap validation spend.", "Define a CAC ceiling before running ads."],
    score: 78,
  },
];

export function TrialExperience() {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [reports, setReports] = useState<AgentReport[]>([]);
  const voiceStageRef = useRef<VoiceStageHandle>(null);

  async function handleUtterance(text: string, onProgress: (label: string) => void): Promise<string> {
    setStarted(true);
    onProgress("The boardroom is weighing in\u2026");
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    setReports(DEMO_REPORTS);
    return DEMO_REPLY;
  }

  return (
    <main className="relative flex h-[100dvh] min-h-[560px] flex-col overflow-hidden bg-radial-ui text-ink">
      <div className="scanline pointer-events-none absolute inset-0" />
      <AnimatedBackground />

      <div className="relative flex h-full min-h-0 flex-col">
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="text-sm font-black tracking-tight sm:text-base">CEO.ai</span>
            <span className="hidden sm:inline">
              <StatusPill icon={Sparkles} label="Live demo · sample data" pulse />
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink/10 bg-white/55 px-3 text-xs font-bold text-ink transition hover:bg-white dark:border-ink/20 dark:bg-ink/[0.08] dark:hover:bg-ink/[0.14] sm:h-10 sm:px-4 sm:text-sm"
            >
              <X size={14} />
              Exit demo
            </button>
            <Link href="/signup">
              <Button className="h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm">
                Sign up free <ArrowRight size={15} />
              </Button>
            </Link>
          </div>
        </header>

        <section className="mx-auto grid w-full max-w-[1400px] flex-1 grid-cols-1 gap-4 overflow-hidden px-4 pb-3 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-6 lg:px-8 lg:pb-4">
          <div className="flex min-h-0 flex-col gap-3">
            {!started ? (
              <div className="animate-rise shrink-0 space-y-2 pb-1">
                <div className="inline-flex w-fit items-center gap-2 rounded-md border border-ink/10 bg-white/70 px-3 py-1.5 text-[0.7rem] font-black shadow-line dark:border-fog/10 dark:bg-white/5 dark:shadow-line-dark sm:text-xs">
                  No account needed
                </div>
                <h1 className="max-w-xl text-[1.7rem] font-black leading-[1.05] sm:text-4xl">
                  Put the boardroom to work on your idea.
                </h1>
                <p className="max-w-lg text-sm leading-6 text-steel sm:text-base sm:leading-7">
                  This is a live demo with sample data — no signup required. Tap the mic and tell the CEO what
                  you&apos;re building, or pick one of the boardroom moves on the right to hear how it responds.
                </p>
              </div>
            ) : null}

            <div className="glass-strong min-h-0 flex-1 rounded-lg p-2 sm:p-3">
              <VoiceStage
                ref={voiceStageRef}
                subtitle="Live demo"
                placeholderPrompt="Tap the mic and tell the CEO what you're building."
                onUtterance={handleUtterance}
              />
            </div>
          </div>

          <aside className="flex min-h-0 flex-col gap-2.5 overflow-hidden">
            <p className="shrink-0 text-[0.7rem] font-black uppercase tracking-wide text-steel sm:text-xs">
              Or try one of these
            </p>
            <div className="command-scroll grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-2.5 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-1">
              {trialSuggestions.map((suggestion) => {
                const Icon = suggestion.icon;
                return (
                  <button
                    key={suggestion.id}
                    type="button"
                    onClick={() => voiceStageRef.current?.submit(suggestion.prompt)}
                    className="glass animate-rise flex min-w-0 flex-col gap-2 rounded-lg p-3 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 sm:p-3.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${suggestion.tone}`}>
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black leading-none sm:text-sm">{suggestion.title}</p>
                        <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-wide text-steel">
                          {suggestion.agent}
                        </p>
                      </div>
                    </div>
                    <p className="text-[0.72rem] leading-5 text-steel sm:text-xs">{suggestion.pitch}</p>
                  </button>
                );
              })}

              {reports.map((report) => (
                <div key={report.title} className="glass animate-rise rounded-lg p-3 sm:p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[0.65rem] font-black uppercase tracking-wide text-steel">{report.agent}</p>
                    <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[0.65rem] font-black text-ink">
                      {report.score}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs font-black leading-5 sm:text-sm">{report.title}</p>
                  <p className="mt-1 text-[0.72rem] leading-5 text-steel sm:text-xs">{report.summary}</p>
                </div>
              ))}
            </div>

            <div className="glass-strong relative shrink-0 overflow-hidden rounded-lg p-4">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ember via-accent to-basil" />
              <p className="text-xs font-black leading-5 sm:text-sm">Like what you see?</p>
              <p className="mt-1 text-[0.72rem] leading-5 text-steel sm:text-xs">
                Sign up free to unlock memory, tasks, agent history, and weekly board reviews.
              </p>
              <Link href="/signup" className="mt-3 inline-block">
                <Button className="h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm">
                  Sign up free <ArrowRight size={14} />
                </Button>
              </Link>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}

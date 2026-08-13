"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Check,
  Link2,
  Lock,
  RotateCcw,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { BoardroomConvening } from "@/components/dashboard/boardroom-convening";
import { ConvictionSpread } from "@/components/dashboard/conviction-spread";
import { Reveal } from "@/components/ui/reveal";
import { ScrollProgress } from "@/components/ui/scroll-chrome";
import { AgentReport } from "@/lib/api";
import { fallbackReports } from "@/lib/dashboard-data";
import { toast } from "@/lib/toast";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

const PRELOADED_GOAL = "AI invoicing for freelance designers";

const VERDICT =
  "CEO decision: proceed only with validation gates. The opportunity scores 71/100. The floor is genuinely split — 44 points between your CTO at 88 and Marketing at 44. That gap is where the real risk sits, and it should be closed with evidence rather than argument. For the next 7 days, do not build. Talk to ten freelance designers and find out what they pay for invoicing today.";

const SECOND_STEP =
  "Marketing scored this 44 while your CTO scored it 88. Ask the board to argue that out.";

const DEBATE_REPLY =
  "Marketing holds: designers already have Wave, Bonsai and a spreadsheet that works. Switching costs are emotional, not technical, and no one wakes up wanting new invoicing software. CTO counters: the wedge isn't invoicing, it's the twenty minutes of chasing late payers every week — a job nobody has automated for this segment. The board's resolution: neither is provable from here. Ask ten designers what they did the last time an invoice went unpaid. If fewer than three describe it as painful, Marketing was right.";

const HISTORY = [
  { agent: "CTO", hit: 7, missed: 2, accuracy: 78 },
  { agent: "CFO", hit: 6, missed: 3, accuracy: 67 },
  { agent: "Product", hit: 5, missed: 4, accuracy: 56 },
  { agent: "Sales", hit: 4, missed: 4, accuracy: 50 },
  { agent: "Marketing", hit: 3, missed: 6, accuracy: 33 },
];

const RESOLVED = [
  { agent: "CFO", statement: "Cost to acquire will exceed first-month revenue.", outcome: "hit" },
  { agent: "Marketing", statement: "Organic will beat paid in month one.", outcome: "missed" },
  { agent: "CTO", statement: "Core workflow shippable in six weeks by one engineer.", outcome: "hit" },
];

function accuracyColor(value: number) {
  if (value >= 70) return "#1d6f5f";
  if (value >= 50) return "#5b7ad6";
  if (value >= 35) return "#b7ca5d";
  return "#d45f3a";
}

export function TrialExperience() {
  const router = useRouter();
  const [reports, setReports] = useState<AgentReport[]>([]);
  const [phase, setPhase] = useState<"idle" | "convening" | "verdict" | "debated">("idle");
  const [debating, setDebating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [exitOffered, setExitOffered] = useState(false);
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }, []);

  const convene = useCallback(() => {
    clearTimers();
    setReports([]);
    setPhase("convening");

    fallbackReports.forEach((report, index) => {
      const id = window.setTimeout(() => {
        setReports(fallbackReports.slice(0, index + 1));
        if (index === fallbackReports.length - 1) {
          timers.current.push(window.setTimeout(() => setPhase("verdict"), 700));
        }
      }, 420 + index * 340);
      timers.current.push(id);
    });
  }, [clearTimers]);

  useEffect(() => {
    const id = window.setTimeout(convene, 900);
    timers.current.push(id);
    return clearTimers;
  }, [convene, clearTimers]);

  useEffect(() => {
    function onLeave(event: MouseEvent) {
      if (event.clientY <= 0 && !exitOffered && phase === "verdict") {
        setExitOffered(true);
        toast.upgrade(
          "Want this report by email?",
          "Sign up free and we'll send the full board verdict, plus weekly reviews.",
        );
      }
    }

    document.addEventListener("mouseout", onLeave);
    return () => document.removeEventListener("mouseout", onLeave);
  }, [exitOffered, phase]);

  function debate() {
    setDebating(true);
    window.setTimeout(() => {
      setDebating(false);
      setPhase("debated");
    }, 1400);
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/trial`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Couldn't copy the link");
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-radial-ui text-ink">
      <ScrollProgress />
      <div className="scanline pointer-events-none absolute inset-0" />
      <AnimatedBackground />

      <div className="relative mx-auto w-full max-w-[1100px] px-4 pb-24 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-2 py-4">
          <div className="flex items-center gap-2.5">
            <span className="vt-logo">
              <Logo size={30} />
            </span>
            <span className="text-sm font-bold tracking-tight">CEO.ai</span>
            <span className="tr-live">
              <span className="tr-live-dot" />
              Live demo · sample data
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => router.push("/")} className="err-btn">
              <X size={14} />
              Exit
            </button>
            <Link href="/signup">
              <Button className="h-10 px-4">
                Sign up free <ArrowRight size={15} />
              </Button>
            </Link>
          </div>
        </header>

        <section className="pt-6 text-center">
          <p className="sec-eyebrow">No account needed</p>
          <h1 className="fr-title mt-3">Your board is already convening.</h1>
          <p className="mx-auto mt-3 max-w-xl text-[0.95rem] leading-8 text-steel">
            We&apos;ve given them a real question so you can watch them work:{" "}
            <span className="tr-goal">{PRELOADED_GOAL}</span>
          </p>
        </section>

        <section className="mt-8">
          <div className="glass-strong rounded-xl p-4 sm:p-6">
            <BoardroomConvening
              reports={reports}
              active={phase === "convening"}
              finalText={phase !== "idle" && phase !== "convening" ? VERDICT : undefined}
            />

            {phase !== "idle" && phase !== "convening" ? (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <button type="button" onClick={convene} className="err-btn">
                  <RotateCcw size={14} />
                  Watch it again
                </button>
                <button type="button" onClick={share} className="err-btn">
                  {copied ? <Check size={14} /> : <Link2 size={14} />}
                  {copied ? "Link copied" : "Share this result"}
                </button>
              </div>
            ) : null}
          </div>
        </section>

        {phase === "verdict" || phase === "debated" ? (
          <Reveal>
            <section className="mt-4">
              <div className="glass rounded-xl p-4 sm:p-6">
                <p className="sec-eyebrow">The verdict</p>
                <p className="mt-3 text-[0.95rem] leading-8">{VERDICT}</p>
              </div>
            </section>
          </Reveal>
        ) : null}

        {phase === "verdict" ? (
          <Reveal delay={120}>
            <section className="tr-next mt-4">
              <div>
                <p className="sec-eyebrow">Try this next</p>
                <p className="mt-2 text-[0.95rem] font-semibold leading-7">{SECOND_STEP}</p>
              </div>
              <button type="button" onClick={debate} disabled={debating} className="tr-next-btn">
                {debating ? "The floor is arguing…" : "Make them argue"}
                {!debating ? <ArrowRight size={15} /> : null}
              </button>
            </section>
          </Reveal>
        ) : null}

        {phase === "debated" ? (
          <Reveal>
            <section className="mt-4">
              <div className="glass rounded-xl p-4 sm:p-6">
                <p className="sec-eyebrow">CTO vs Marketing</p>
                <p className="mt-3 text-[0.95rem] leading-8">{DEBATE_REPLY}</p>
              </div>
            </section>
          </Reveal>
        ) : null}

        {reports.length >= 4 ? (
          <Reveal delay={80}>
            <section className="mt-4">
              <div className="glass rounded-xl p-4 sm:p-6">
                <ConvictionSpread reports={reports} />
              </div>
            </section>
          </Reveal>
        ) : null}

        <Reveal delay={140}>
          <section className="mt-4">
            <div className="lock-root">
              <div className="lock-content glass rounded-xl p-4 sm:p-6">
                <div className="flex items-center gap-2">
                  <Target size={15} className="text-steel" />
                  <p className="sec-eyebrow">Track record · after three months</p>
                </div>

                <div className="mt-4 space-y-2.5">
                  {HISTORY.map((entry) => (
                    <div key={entry.agent}>
                      <div className="mb-1 flex items-baseline justify-between gap-3">
                        <p className="text-[0.8rem] font-bold">{entry.agent}</p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[0.68rem] font-semibold text-steel">
                            {entry.hit}/{entry.hit + entry.missed}
                          </span>
                          <span
                            className="text-[0.82rem] font-black tabular-nums"
                            style={{ color: accuracyColor(entry.accuracy) }}
                          >
                            {entry.accuracy}%
                          </span>
                        </div>
                      </div>
                      <div className="sec-bar">
                        <div
                          className="sec-bar-fill"
                          style={{
                            width: `${entry.accuracy}%`,
                            background: accuracyColor(entry.accuracy),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 space-y-2">
                  {RESOLVED.map((entry) => (
                    <div key={entry.statement} className="sec-card rounded-lg px-3.5 py-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="sec-eyebrow">{entry.agent}</span>
                        <span
                          className={cn(
                            "text-[0.66rem] font-black uppercase tracking-widest",
                            entry.outcome === "hit" ? "text-basil" : "text-ember",
                          )}
                        >
                          {entry.outcome === "hit" ? "Right" : "Wrong"}
                        </span>
                      </div>
                      <p className="mt-1 text-[0.8rem] font-semibold leading-6">{entry.statement}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lock-veil">
                <div className="lock-card">
                  <span className="lock-badge">
                    <Lock size={11} />
                    Simulated
                  </span>
                  <p className="lock-title">This is what three months looks like</p>
                  <p className="lock-body">
                    Every prediction your board makes is dated and scored. Accuracy only means
                    something once history accumulates — so this one is simulated, honestly
                    labelled. Yours starts building the day you sign up.
                  </p>
                  <Link href="/signup" className="lock-cta">
                    Start building yours
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal delay={160}>
          <section className="mt-8 text-center">
            <p className="sec-eyebrow">Ready?</p>
            <h2 className="fr-title mt-3">Nothing here is saved.</h2>
            <p className="mx-auto mt-3 max-w-lg text-[0.95rem] leading-8 text-steel">
              Sign up free and the board remembers what you decided, scores your progress weekly,
              and starts building a track record you can hold it to.
            </p>
            <Link href="/signup" className="mt-6 inline-block">
              <Button className="h-12 px-7">
                <Sparkles size={16} />
                Convene your own board
              </Button>
            </Link>
          </section>
        </Reveal>
      </div>

      <Toaster />
    </main>
  );
}

"use client";

import { FormEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Brain, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { StatusPill } from "@/components/ui/status-pill";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { trialSuggestions } from "@/lib/trial-suggestions";
import { ChatMessage, AgentReport } from "@/lib/api";
import { starterPrompts } from "@/lib/dashboard-data";

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
  const [goal, setGoal] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  function scrollToEnd() {
    window.setTimeout(() => transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
  }

  function simulateReply() {
    setLoading(true);
    window.setTimeout(() => {
      const reply: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: DEMO_REPLY,
        created_at: new Date().toISOString(),
        reports: DEMO_REPORTS,
      };
      setMessages((current) => [...current, reply]);
      setLoading(false);
      scrollToEnd();
    }, 900);
  }

  function runPrompt(prompt: string) {
    const trimmed = prompt.trim();
    if (!trimmed) return;
    setStarted(true);
    setGoal("");
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, userMessage]);
    scrollToEnd();
    simulateReply();
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    runPrompt(goal);
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
              <div className="animate-rise flex min-h-0 flex-1 flex-col justify-center gap-3">
                <div className="inline-flex w-fit items-center gap-2 rounded-md border border-ink/10 bg-white/70 px-3 py-1.5 text-[0.7rem] font-black shadow-line dark:border-fog/10 dark:bg-white/5 dark:shadow-line-dark sm:text-xs">
                  No account needed
                </div>
                <h1 className="max-w-xl text-[1.7rem] font-black leading-[1.05] sm:text-4xl">
                  Put the boardroom to work on your idea.
                </h1>
                <p className="max-w-lg text-sm leading-6 text-steel sm:text-base sm:leading-7">
                  This is a live demo with sample data — no signup required. Type your own goal below, or pick one
                  of the boardroom moves on the right to see how the CEO and specialists respond.
                </p>
              </div>
            ) : null}

            {started ? (
              <div className="glass-strong command-scroll min-h-0 flex-1 space-y-4 overflow-y-auto rounded-lg p-4 sm:p-5">
                {messages.map((message) => (
                  <div key={message.id} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={
                        message.role === "user"
                          ? "max-w-[85%] rounded-lg bg-ink px-4 py-3 text-sm font-semibold leading-6 text-fog"
                          : "max-w-[92%] space-y-3"
                      }
                    >
                      {message.role === "assistant" ? (
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-steel">
                          <Brain size={14} className="text-accent" />
                          CEO
                        </div>
                      ) : null}
                      <p
                        className={
                          message.role === "user"
                            ? ""
                            : "rounded-lg border border-ink/10 bg-white/70 p-3 text-sm font-semibold leading-6 shadow-line dark:border-fog/10 dark:bg-white/5 dark:shadow-line-dark"
                        }
                      >
                        {message.content}
                      </p>
                      {message.reports?.length ? (
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          {message.reports.map((report) => (
                            <div
                              key={report.title}
                              className="glass rounded-lg p-3 transition hover:-translate-y-0.5"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[0.65rem] font-black uppercase tracking-wide text-steel">
                                  {report.agent}
                                </p>
                                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[0.65rem] font-black text-ink">
                                  {report.score}
                                </span>
                              </div>
                              <p className="mt-1.5 text-xs font-black leading-5 sm:text-sm">{report.title}</p>
                              <p className="mt-1 text-[0.72rem] leading-5 text-steel sm:text-xs">{report.summary}</p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
                {loading ? (
                  <div className="flex items-center gap-2 text-xs font-bold text-steel">
                    <Loader2 size={14} className="animate-spin text-accent" />
                    The boardroom is weighing in…
                  </div>
                ) : null}
                <div ref={transcriptEndRef} />
              </div>
            ) : null}

            <form onSubmit={handleSubmit} className="shrink-0 space-y-3">
              <div className="rounded-lg border border-ink/10 bg-white/75 p-2 shadow-line dark:border-fog/10 dark:bg-white/5 dark:shadow-line-dark">
                <textarea
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                  placeholder="Tell the boardroom what you're building or challenge your plan…"
                  className="min-h-20 w-full resize-none rounded-md bg-transparent p-3 text-sm font-semibold leading-7 outline-none"
                />
                {!started ? (
                  <div className="flex flex-wrap gap-2 border-t border-ink/10 p-2 dark:border-fog/10">
                    {starterPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setGoal(prompt)}
                        className="rounded-md bg-fog px-3 py-2 text-left text-xs font-bold leading-5 text-steel transition hover:bg-chartreuse/30 hover:text-ink dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <Button disabled={loading || !goal.trim()} className="h-12 w-full sm:w-auto">
                {loading ? <Loader2 className="animate-spin" size={17} /> : <Brain size={17} />}
                {started ? "Send to the boardroom" : "Start CEO Session"}
              </Button>
            </form>
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
                    onClick={() => runPrompt(suggestion.prompt)}
                    disabled={loading}
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

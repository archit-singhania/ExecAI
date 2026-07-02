"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowRight,
  BadgeIndianRupee,
  Brain,
  BriefcaseBusiness,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Cpu,
  Files,
  Gauge,
  Layers3,
  LineChart,
  Loader2,
  Megaphone,
  Mic,
  Orbit,
  Radio,
  Scale,
  Send,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
  Users,
  Volume2,
  WandSparkles,
} from "lucide-react";
import { api, AgentReport, ChatMessage, DashboardSummary, Memory, Session, Task } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const starterPrompts = [
  "I have Rs 2 lakh. I want to start an online business.",
  "Challenge my idea: an AI resume builder for freshers.",
  "Create a 30-day launch plan for a micro SaaS.",
];

const agentMeta: Record<string, { icon: React.ElementType; tone: string; orbit: string }> = {
  "Market Research": { icon: TrendingUp, tone: "bg-basil/10 text-basil", orbit: "Demand" },
  CFO: { icon: BadgeIndianRupee, tone: "bg-ember/10 text-ember", orbit: "Runway" },
  CTO: { icon: Cpu, tone: "bg-ink/10 text-ink", orbit: "Build" },
  "Product Manager": { icon: Target, tone: "bg-chartreuse/25 text-ink", orbit: "Scope" },
  Marketing: { icon: Megaphone, tone: "bg-steel/10 text-steel", orbit: "Growth" },
  Legal: { icon: Scale, tone: "bg-ink/10 text-ink", orbit: "Risk" },
  Sales: { icon: Users, tone: "bg-basil/10 text-basil", orbit: "Pilots" },
  Designer: { icon: WandSparkles, tone: "bg-ember/10 text-ember", orbit: "UX" },
  "Executive Assistant": { icon: TimerReset, tone: "bg-chartreuse/25 text-ink", orbit: "Rhythm" },
};

const operatingPhases = [
  "Core chat",
  "Agent graph",
  "Long-term memory",
  "Reports",
  "Voice",
  "Board meetings",
];

export default function Home() {
  const [goal, setGoal] = useState(starterPrompts[0]);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState("");
  const [boardReport, setBoardReport] = useState<AgentReport | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const summary = await api.dashboard();
        setDashboard(summary);
        if (summary.active_session) {
          setSession(summary.active_session);
          setMessages(await api.getMessages(summary.active_session.id));
          setMemories(await api.getMemories(summary.active_session.id));
        }
      } catch {
        setError("Backend is not reachable yet. Start FastAPI on port 8000.");
      } finally {
        setBooting(false);
      }
    }
    load();
  }, []);

  const latestReports = useMemo(() => {
    const fromMessages = messages.flatMap((message) => message.reports ?? []);
    return fromMessages.length ? fromMessages.slice(-9) : dashboard?.reports ?? [];
  }, [messages, dashboard]);

  const activeTasks = dashboard?.tasks ?? fallbackTasks;
  const doneTasks = activeTasks.filter((task) => task.status.toLowerCase() === "done").length;
  const healthScore = session?.health_score ?? 82;
  const runway = session?.runway_months ?? 6;
  const opportunityScore = latestReports.length
    ? Math.round(latestReports.reduce((total, report) => total + report.score, 0) / latestReports.length)
    : 84;

  async function refreshSession(sessionId: string) {
    setDashboard(await api.dashboard());
    setMemories(await api.getMemories(sessionId));
  }

  async function startSession(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    try {
      const created = await api.createSession(goal);
      setSession(created);
      const firstMessage = await api.sendMessage(created.id, goal);
      setMessages([firstMessage]);
      await refreshSession(created.id);
      setInput("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!input.trim()) return;

    if (!session) {
      setGoal(input);
      await startSession();
      return;
    }

    const optimistic: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      created_at: new Date().toISOString(),
    };

    setMessages((current) => [...current, optimistic]);
    setInput("");
    setLoading(true);
    setError("");
    try {
      const response = await api.sendMessage(session.id, optimistic.content);
      setMessages((current) => [...current, response]);
      await refreshSession(session.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function completeTask(taskId: string) {
    setError("");
    try {
      await api.updateTask(taskId, "Done");
      setDashboard(await api.dashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update task.");
    }
  }

  async function generateBoardMeeting() {
    if (!session) {
      setError("Start a CEO session before generating a board meeting.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const report = await api.generateBoardMeeting(session.id);
      setBoardReport(report);
      await refreshSession(session.id);
      speak(`${report.title}. ${report.summary}. ${report.bullets.join(". ")}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate board meeting.");
    } finally {
      setLoading(false);
    }
  }

  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.94;
    utterance.pitch = 0.88;
    window.speechSynthesis.speak(utterance);
  }

  function startVoiceInput() {
    type SpeechRecognitionLike = {
      lang: string;
      interimResults: boolean;
      maxAlternatives: number;
      start: () => void;
      onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
      onerror: (() => void) | null;
    };
    type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

    const browserWindow = window as typeof window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setError("Voice input is not supported in this browser yet. Chrome or Edge works best.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        setInput(transcript);
        setGoal(transcript);
      }
    };
    recognition.onerror = () => setError("Voice capture failed. Try again or type the prompt.");
    recognition.start();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-radial-ui text-ink">
      <div className="ambient-grid absolute inset-0" />
      <div className="scanline pointer-events-none absolute inset-0" />

      <div className="relative mx-auto flex max-w-[1540px] flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="glass-strong sticky top-4 z-30 flex flex-col gap-4 rounded-lg px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="relative grid h-12 w-12 place-items-center rounded-lg bg-ink text-fog shadow-glow">
              <BriefcaseBusiness size={23} />
              <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-chartreuse ring-4 ring-fog" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-steel">CEO.ai</p>
              <h1 className="text-xl font-black sm:text-2xl">Autonomous executive command center</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusPill icon={Radio} label={booting ? "Connecting" : "Live system"} pulse />
            <StatusPill icon={ShieldCheck} label="Human approval mode" />
            <Button variant="ghost" onClick={generateBoardMeeting} disabled={loading || !session}>
              Board Review <Volume2 size={16} />
            </Button>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[1.03fr_0.97fr]">
          <div className="glass-strong relative overflow-hidden rounded-lg">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ember via-chartreuse to-basil" />
            <div className="grid min-h-[620px] lg:grid-cols-[0.92fr_1.08fr]">
              <div className="flex flex-col justify-between border-b border-ink/10 p-5 sm:p-7 lg:border-b-0 lg:border-r">
                <div>
                  <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-ink/10 bg-white/70 px-3 py-2 text-sm font-black shadow-line">
                    <Sparkles size={16} />
                    CEO + 9 specialist agents
                  </div>
                  <h2 className="max-w-xl text-4xl font-black leading-[0.98] sm:text-6xl">
                    A boardroom that thinks, argues, and executes.
                  </h2>
                  <p className="mt-5 max-w-xl text-base leading-7 text-steel">
                    Give it capital, a rough idea, or a weak assumption. The AI CEO coordinates specialists,
                    challenges the strategy, creates proof tasks, stores memory, and runs board reviews.
                  </p>
                </div>

                <form onSubmit={startSession} className="mt-8 space-y-3">
                  <div className="rounded-lg border border-ink/10 bg-white/70 p-2 shadow-line">
                    <textarea
                      value={goal}
                      onChange={(event) => setGoal(event.target.value)}
                      className="min-h-32 w-full resize-none rounded-md bg-transparent p-3 text-base font-semibold leading-7 outline-none"
                    />
                    <div className="flex flex-wrap gap-2 border-t border-ink/10 p-2">
                      {starterPrompts.map((prompt) => (
                        <button
                          key={prompt}
                          type="button"
                          onClick={() => setGoal(prompt)}
                          className="rounded-md bg-fog px-3 py-2 text-xs font-bold text-steel transition hover:bg-chartreuse/30 hover:text-ink"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button disabled={loading} className="h-12 w-full sm:w-auto">
                      {loading ? <Loader2 className="animate-spin" size={17} /> : <Brain size={17} />}
                      Start CEO Session
                    </Button>
                    <Button type="button" variant="ghost" className="h-12 w-full sm:w-auto" onClick={startVoiceInput}>
                      <Mic size={17} />
                      Voice Capture
                    </Button>
                  </div>
                </form>
              </div>

              <ExecutiveGraph
                healthScore={healthScore}
                opportunityScore={opportunityScore}
                runway={runway}
                doneTasks={doneTasks}
                taskCount={activeTasks.length}
              />
            </div>
          </div>

          <CommandPanel
            session={session}
            messages={messages}
            input={input}
            loading={loading}
            error={error}
            setInput={setInput}
            sendMessage={sendMessage}
          />
        </section>

        <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
          <AgentBriefing reports={latestReports.length ? latestReports : fallbackReports} />
          <div className="grid gap-5 lg:grid-cols-2">
            <TaskBoard tasks={activeTasks} completeTask={completeTask} />
            <BoardTheater
              boardReport={boardReport}
              memories={memories.length ? memories.slice(0, 4) : fallbackMemories}
              loading={loading}
              session={session}
              generateBoardMeeting={generateBoardMeeting}
            />
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.78fr_1.22fr]">
          <OperatingPhases />
          <KpiRunway reports={latestReports.length ? latestReports : fallbackReports} opportunityScore={opportunityScore} />
        </section>
      </div>
    </main>
  );
}

function ExecutiveGraph({
  healthScore,
  opportunityScore,
  runway,
  doneTasks,
  taskCount,
}: {
  healthScore: number;
  opportunityScore: number;
  runway: number;
  doneTasks: number;
  taskCount: number;
}) {
  const orbitAgents = Object.entries(agentMeta);

  return (
    <div className="relative min-h-[520px] overflow-hidden bg-ink p-5 text-fog">
      <div className="executive-gradient absolute inset-0" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(246,244,238,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(246,244,238,0.06)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="relative grid h-full content-between gap-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DarkMetric icon={Gauge} label="Health" value={`${healthScore}%`} />
          <DarkMetric icon={LineChart} label="Opportunity" value={`${opportunityScore}`} />
          <DarkMetric icon={CircleDollarSign} label="Runway" value={`${runway} mo`} />
          <DarkMetric icon={CheckCircle2} label="Tasks" value={`${doneTasks}/${taskCount}`} />
        </div>

        <div className="relative mx-auto grid aspect-square w-full max-w-[430px] place-items-center">
          <div className="absolute inset-8 rounded-full border border-white/10" />
          <div className="absolute inset-16 rounded-full border border-dashed border-white/15" />
          <div className="absolute inset-0 animate-spin-slow rounded-full border border-transparent border-t-chartreuse/70" />
          <div className="absolute inset-12 animate-reverse-spin rounded-full border border-transparent border-r-ember/70" />
          <div className="absolute grid h-36 w-36 place-items-center rounded-full border border-white/15 bg-white/10 text-center shadow-[0_0_80px_rgba(183,202,93,0.22)] backdrop-blur-xl">
            <div>
              <Brain className="mx-auto mb-2 text-chartreuse" size={30} />
              <p className="text-xs font-black uppercase tracking-[0.18em] text-fog/55">CEO Core</p>
              <p className="mt-1 text-2xl font-black">{healthScore}</p>
            </div>
          </div>

          {orbitAgents.map(([name, meta], index) => {
            const angle = (index / orbitAgents.length) * Math.PI * 2 - Math.PI / 2;
            const radius = 42;
            const x = 50 + Math.cos(angle) * radius;
            const y = 50 + Math.sin(angle) * radius;
            const Icon = meta.icon;

            return (
              <div
                key={name}
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/12 bg-white/12 px-3 py-2 shadow-glass backdrop-blur-md"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div className="flex items-center gap-2">
                  <Icon className="text-chartreuse" size={15} />
                  <div>
                    <p className="text-xs font-black">{meta.orbit}</p>
                    <p className="text-[10px] font-semibold text-fog/50">{name}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Signal icon={Layers3} label="Architecture" value="Next + FastAPI + LangGraph" />
          <Signal icon={Orbit} label="Operating Mode" value="Contrarian + accountable" />
        </div>
      </div>
    </div>
  );
}

function CommandPanel({
  session,
  messages,
  input,
  loading,
  error,
  setInput,
  sendMessage,
}: {
  session: Session | null;
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  error: string;
  setInput: (value: string) => void;
  sendMessage: (event: FormEvent) => void;
}) {
  return (
    <section className="glass-strong flex min-h-[620px] flex-col rounded-lg p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-steel">Command Center</p>
          <h2 className="text-2xl font-black">Executive chat</h2>
        </div>
        <div className="rounded-md bg-basil/10 px-3 py-2 text-sm font-black text-basil">
          {session ? "Session active" : "Ready"}
        </div>
      </div>

      <div className="command-scroll flex-1 space-y-3 overflow-y-auto rounded-lg border border-ink/10 bg-white/48 p-3">
        {!messages.length && (
          <div className="grid h-full place-items-center py-10 text-center">
            <div className="max-w-sm">
              <Brain className="mx-auto mb-3 text-steel" size={38} />
              <p className="text-lg font-black">Start with a business goal.</p>
              <p className="mt-2 text-sm leading-6 text-steel">
                The CEO will route it through the agent floor and return a board-style brief.
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "animate-rise rounded-lg px-4 py-3",
              message.role === "user"
                ? "ml-auto max-w-[88%] bg-ink text-fog"
                : "mr-auto max-w-[94%] border border-ink/10 bg-white text-ink shadow-line",
            )}
          >
            <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
          </div>
        ))}

        {loading && (
          <div className="mr-auto inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black shadow-line">
            <Loader2 className="animate-spin" size={16} />
            Agents are debating the plan
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask the CEO to challenge, plan, analyze, or create tasks..."
          className="h-12 rounded-md border border-ink/10 bg-white/70 px-4 font-semibold outline-none ring-ink/10 transition focus:ring-4"
        />
        <Button disabled={loading} className="h-12">
          <Send size={17} />
          Send
        </Button>
      </form>
      {error ? <p className="mt-3 rounded-md bg-ember/10 px-3 py-2 text-sm font-bold text-ember">{error}</p> : null}
    </section>
  );
}

function AgentBriefing({ reports }: { reports: AgentReport[] }) {
  return (
    <section className="glass-strong rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-steel">Agent Floor</p>
          <h2 className="text-2xl font-black">Specialist briefings</h2>
        </div>
        <div className="rounded-md bg-chartreuse/25 px-3 py-2 text-sm font-black">
          {reports.length} active
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {reports.map((report, index) => (
          <AgentCard key={`${report.agent}-${report.title}-${index}`} report={report} index={index} />
        ))}
      </div>
    </section>
  );
}

function TaskBoard({ tasks, completeTask }: { tasks: Task[]; completeTask: (taskId: string) => void }) {
  return (
    <section className="glass-strong rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-steel">Execution</p>
          <h2 className="text-2xl font-black">Priority tasks</h2>
        </div>
        <Check className="text-basil" size={24} />
      </div>
      <div className="space-y-3">
        {tasks.map((task) => (
          <div key={task.id} className="group rounded-lg border border-ink/10 bg-white/62 p-4 transition hover:-translate-y-0.5 hover:shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <p className="font-black leading-6">{task.title}</p>
              <span className={cn("rounded-md px-2 py-1 text-xs font-black", task.priority === "High" ? "bg-ember text-white" : "bg-ink text-fog")}>
                {task.priority}
              </span>
            </div>
            {task.description ? <p className="mt-2 text-sm leading-6 text-steel">{task.description}</p> : null}
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-steel">{task.created_by_agent}</p>
              {task.status.toLowerCase() !== "done" ? (
                <button
                  className="rounded-md border border-ink/10 bg-white px-3 py-2 text-xs font-black transition hover:bg-chartreuse/30"
                  onClick={() => completeTask(task.id)}
                >
                  Mark done
                </button>
              ) : (
                <span className="rounded-md bg-basil/10 px-3 py-2 text-xs font-black text-basil">Completed</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function BoardTheater({
  boardReport,
  memories,
  loading,
  session,
  generateBoardMeeting,
}: {
  boardReport: AgentReport | null;
  memories: Memory[];
  loading: boolean;
  session: Session | null;
  generateBoardMeeting: () => void;
}) {
  return (
    <section className="glass-strong rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-steel">Board Room</p>
          <h2 className="text-2xl font-black">Weekly review</h2>
        </div>
        <Button variant="ghost" onClick={generateBoardMeeting} disabled={loading || !session}>
          <Volume2 size={16} />
          Run
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-lg bg-ink p-4 text-fog">
        <div className="executive-gradient absolute inset-0 opacity-70" />
        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-fog/55">CEO board verdict</p>
          <h3 className="mt-3 text-2xl font-black leading-tight">
            {boardReport?.title ?? "No board meeting generated yet"}
          </h3>
          <p className="mt-3 text-sm leading-6 text-fog/70">
            {boardReport?.summary ??
              "Generate a board review after the CEO has created reports and tasks. It will score progress, call out missed work, and speak the summary aloud."}
          </p>
          {boardReport ? (
            <div className="mt-4 grid gap-2">
              {boardReport.bullets.map((bullet) => (
                <p key={bullet} className="rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold">
                  {bullet}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-ink/10 bg-white/58 p-4">
        <h3 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-steel">Memory trail</h3>
        <div className="space-y-2">
          {memories.map((memory) => (
            <div key={memory.id} className="rounded-md bg-fog px-3 py-2">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-steel">{memory.kind}</p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6">{memory.content}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function OperatingPhases() {
  return (
    <section className="glass-strong rounded-lg p-5">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-steel">Roadmap</p>
        <h2 className="text-2xl font-black">Operating phases</h2>
      </div>
      <div className="space-y-3">
        {operatingPhases.map((phase, index) => (
          <div key={phase} className="flex items-center gap-3 rounded-lg bg-white/62 p-3 shadow-line">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-chartreuse/30 text-sm font-black">{index + 1}</div>
            <div className="min-w-0 flex-1">
              <p className="font-black">{phase}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/8">
                <div className="h-full rounded-full bg-ink" style={{ width: `${Math.min(100, 45 + index * 9)}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function KpiRunway({ reports, opportunityScore }: { reports: AgentReport[]; opportunityScore: number }) {
  const sorted = [...reports].sort((a, b) => b.score - a.score).slice(0, 6);

  return (
    <section className="glass-strong rounded-lg p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-steel">Business Intelligence</p>
          <h2 className="text-2xl font-black">Signal map</h2>
        </div>
        <div className="rounded-md bg-ink px-3 py-2 text-sm font-black text-fog">{opportunityScore}/100</div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg bg-ink p-5 text-fog">
          <p className="text-sm font-bold text-fog/60">Executive read</p>
          <p className="mt-3 text-3xl font-black leading-tight">Validation approved. Full build blocked until proof.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Signal icon={Files} label="Reports" value={`${reports.length}`} />
            <Signal icon={Activity} label="Cadence" value="Weekly" />
          </div>
        </div>
        <div className="space-y-3">
          {sorted.map((report) => (
            <div key={`${report.agent}-${report.title}`} className="rounded-lg border border-ink/10 bg-white/62 p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-black">{report.agent}</p>
                <p className="text-sm font-black text-steel">{report.score}</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink/8">
                <div className="h-full rounded-full bg-gradient-to-r from-ember via-chartreuse to-basil" style={{ width: `${report.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatusPill({ icon: Icon, label, pulse = false }: { icon: React.ElementType; label: string; pulse?: boolean }) {
  return (
    <div className="inline-flex h-10 items-center gap-2 rounded-md border border-ink/10 bg-white/60 px-3 text-sm font-black shadow-line">
      <span className={cn("grid h-5 w-5 place-items-center rounded-full", pulse ? "bg-basil/10 text-basil" : "text-ink")}>
        <Icon size={14} />
      </span>
      {label}
    </div>
  );
}

function DarkMetric({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/12 bg-white/10 p-4 backdrop-blur">
      <Icon className="mb-3 text-chartreuse" size={20} />
      <p className="text-xs font-black uppercase tracking-[0.16em] text-fog/50">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}

function Signal({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/12 bg-white/8 p-4 backdrop-blur">
      <Icon className="mb-3 text-chartreuse" size={22} />
      <p className="text-sm text-fog/60">{label}</p>
      <p className="font-black">{value}</p>
    </div>
  );
}

function AgentCard({ report, index }: { report: AgentReport; index: number }) {
  const meta = agentMeta[report.agent] ?? { icon: Brain, tone: "bg-ink/10 text-ink", orbit: "Signal" };
  const Icon = meta.icon;

  return (
    <div className="animate-rise rounded-lg border border-ink/10 bg-white/62 p-4 transition hover:-translate-y-0.5 hover:shadow-soft" style={{ animationDelay: `${index * 35}ms` }}>
      <div className="flex items-start gap-3">
        <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-md", meta.tone)}>
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-steel">{report.agent}</p>
              <h3 className="mt-1 font-black leading-6">{report.title}</h3>
            </div>
            <span className="rounded-md bg-ink px-2 py-1 text-xs font-black text-fog">{report.score}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-steel">{report.summary}</p>
          {report.bullets.length ? (
            <div className="mt-3 space-y-1">
              {report.bullets.slice(0, 2).map((bullet) => (
                <p key={bullet} className="flex gap-2 text-xs font-bold leading-5 text-ink/70">
                  <ArrowRight className="mt-0.5 shrink-0 text-basil" size={13} />
                  {bullet}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

const fallbackReports: AgentReport[] = [
  {
    agent: "Market Research",
    report_type: "agent",
    title: "Demand exists, but niche selection matters",
    summary: "Start with a painful, frequent workflow for one customer segment before broad automation.",
    bullets: ["Interview users already paying with time or money.", "Reject broad markets until there is a sharper wedge."],
    score: 84,
  },
  {
    agent: "CFO",
    report_type: "agent",
    title: "Keep first validation under Rs 25k",
    summary: "Spend on interviews, landing page tests, and one paid channel experiment before product build.",
    bullets: ["Cap validation spend.", "Define CAC ceiling before ads."],
    score: 78,
  },
  {
    agent: "CTO",
    report_type: "agent",
    title: "Ship the narrowest workflow first",
    summary: "Build the loop that proves repeat value: input, CEO decision, report, task, and memory.",
    bullets: ["Instrument conversion.", "Avoid background automation until board review works."],
    score: 86,
  },
];

const fallbackTasks: Task[] = [
  {
    id: "1",
    title: "Interview 10 target customers",
    description: "Capture exact pain language and willingness to pay.",
    priority: "High",
    status: "Not started",
    created_by_agent: "Market Research",
    completed_at: null,
  },
  {
    id: "2",
    title: "Draft landing page offer",
    description: "Test one audience and one promise.",
    priority: "High",
    status: "Ready",
    created_by_agent: "Marketing",
    completed_at: null,
  },
  {
    id: "3",
    title: "List 5 competitor pricing models",
    description: "Look for pricing gaps and weak reviews.",
    priority: "Medium",
    status: "Ready",
    created_by_agent: "CFO",
    completed_at: null,
  },
];

const fallbackMemories: Memory[] = [
  {
    id: "memory-1",
    kind: "decision",
    content: "The CEO will block full product buildout until validation evidence exists.",
    importance: 0.9,
    created_at: new Date().toISOString(),
  },
  {
    id: "memory-2",
    kind: "strategy",
    content: "The strongest wedge is a narrow, painful workflow with clear willingness to pay.",
    importance: 0.8,
    created_at: new Date().toISOString(),
  },
];

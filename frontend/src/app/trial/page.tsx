"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brain, Loader2, Mic, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { ExecutiveGraph } from "@/components/sections/executive-graph";
import { CommandPanel } from "@/components/sections/command-panel";
import { AgentBriefing } from "@/components/sections/agent-briefing";
import { TaskBoard } from "@/components/sections/task-board";
import { BoardTheater } from "@/components/sections/board-theater";
import { OperatingPhases } from "@/components/sections/operating-phases";
import { KpiRunway } from "@/components/sections/kpi-runway";
import { ChatMessage, AgentReport, Task } from "@/lib/api";
import {
  DashboardTab,
  fallbackMemories,
  fallbackReports,
  fallbackTasks,
  starterPrompts,
  TaskFilter,
} from "@/lib/dashboard-data";
import { useLocale } from "@/lib/i18n";

const TAB_TITLES: Record<DashboardTab, string> = {
  overview: "Overview",
  chat: "Chat with the CEO",
  agents: "Agent briefing",
  tasks: "Task board",
  board: "Board & memory",
  operations: "Operations",
};

const DEMO_REPLY =
  "Here's how the boardroom would open this up: Market Research would pressure-test demand with real interviews before any build, CFO would cap validation spend and track runway, and CTO would scope the narrowest workflow that still proves repeat value. Sign up free to run this for real, with memory, tasks, and weekly board reviews.";

export default function TrialPage() {
  const router = useRouter();
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [goal, setGoal] = useState(starterPrompts[0]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(fallbackTasks);
  const [boardReport, setBoardReport] = useState<AgentReport | null>(null);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("All");
  const [started, setStarted] = useState(false);

  const doneTasks = tasks.filter((task) => task.status.toLowerCase() === "done").length;
  const filteredTasks = tasks.filter((task) => {
    if (taskFilter === "Done") return task.status.toLowerCase() === "done";
    if (taskFilter === "Open") return task.status.toLowerCase() !== "done";
    if (taskFilter === "High") return task.priority === "High";
    return true;
  });

  const opportunityScore = useMemo(
    () => Math.round(fallbackReports.reduce((total, report) => total + report.score, 0) / fallbackReports.length),
    [],
  );

  function simulateReply(prompt: string) {
    setLoading(true);
    window.setTimeout(() => {
      const reply: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `${prompt.trim() ? "" : ""}${DEMO_REPLY}`,
        created_at: new Date().toISOString(),
        reports: fallbackReports,
      };
      setMessages((current) => [...current, reply]);
      setLoading(false);
    }, 900);
  }

  function startSession(event?: FormEvent) {
    event?.preventDefault();
    setStarted(true);
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: goal,
      created_at: new Date().toISOString(),
    };
    setMessages([userMessage]);
    simulateReply(goal);
    setInput("");
    setActiveTab("chat");
  }

  function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!input.trim()) return;
    if (!started) {
      setGoal(input);
      startSession();
      return;
    }
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input,
      created_at: new Date().toISOString(),
    };
    setMessages((current) => [...current, userMessage]);
    simulateReply(input);
    setInput("");
  }

  function completeTask(taskId: string) {
    setTasks((current) => current.map((task) => (task.id === taskId ? { ...task, status: "Done" } : task)));
  }

  function generateBoardMeeting() {
    setLoading(true);
    window.setTimeout(() => {
      setBoardReport({
        agent: "CEO",
        title: "Demo board verdict: validate before you build",
        summary: "Runway is healthy and demand signals are promising, but full build stays blocked until interviews confirm willingness to pay.",
        bullets: [
          "Ship the landing page test this week.",
          "Cap spend until 10 customer interviews are done.",
          "Re-run this review after the first pilot list is built.",
        ],
        score: 82,
      });
      setLoading(false);
      setActiveTab("board");
    }, 900);
  }

  function startVoiceInput() {
    setInput((current) => current || "Show me how the CEO would challenge my launch plan.");
  }

  function exitDemo() {
    router.push("/");
  }

  return (
    <main className="relative flex h-[100dvh] min-h-[560px] flex-col overflow-hidden bg-radial-ui p-2.5 text-ink sm:p-3.5 lg:p-4">
      <div className="scanline pointer-events-none absolute inset-0" />

      <div className="relative mb-2.5 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-bold text-ink sm:mb-3.5">
        <span className="flex items-center gap-2">
          <Sparkles size={14} className="text-accent" />
          {t("demo.banner")}
        </span>
        <Link href="/signup">
          <Button className="h-8 px-3 text-xs">{t("demo.cta")}</Button>
        </Link>
      </div>

      <div className="relative flex h-full min-h-0 w-full gap-3 sm:gap-4">
        <DashboardSidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          user={{ id: "demo", name: "Demo Founder", email: "demo mode", created_at: new Date().toISOString() }}
          onLogout={exitDemo}
        />

        <div className="flex h-full min-w-0 flex-1 flex-col gap-3 sm:gap-4">
          <DashboardTopbar
            title={TAB_TITLES[activeTab]}
            booting={false}
            loading={loading}
            hasSession={started}
            onBoardReview={generateBoardMeeting}
          />

          <div className="command-scroll min-h-0 flex-1 overflow-y-auto rounded-lg">
            {activeTab === "overview" ? (
              <div className="grid gap-4 xl:grid-cols-[1.03fr_0.97fr]">
                <div className="glass-strong relative overflow-hidden rounded-lg">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ember via-accent to-basil" />
                  <div className="grid lg:min-h-[520px] lg:grid-cols-[0.92fr_1.08fr]">
                    <div className="flex flex-col justify-between border-b border-ink/10 p-4 dark:border-fog/10 sm:p-6 lg:border-b-0 lg:border-e">
                      <div>
                        <div className="mb-4 inline-flex max-w-full items-center gap-2 rounded-md border border-ink/10 bg-white/70 px-3 py-2 text-xs font-black shadow-line dark:border-fog/10 dark:bg-white/5 dark:shadow-line-dark">
                          <Sparkles size={16} className="text-accent" />
                          CEO + 9 specialist agents
                        </div>
                        <h2 className="max-w-xl text-3xl font-black leading-[1.02] sm:text-4xl">
                          A boardroom that thinks, argues, and executes.
                        </h2>
                        <p className="mt-4 max-w-xl text-sm leading-6 text-steel sm:text-base sm:leading-7">
                          This is a live demo with sample data — no account needed. Start a session to see how the
                          CEO would respond.
                        </p>
                      </div>

                      <form onSubmit={startSession} className="mt-6 space-y-3">
                        <div className="rounded-lg border border-ink/10 bg-white/75 p-2 shadow-line dark:border-fog/10 dark:bg-white/5 dark:shadow-line-dark">
                          <textarea
                            value={goal}
                            onChange={(event) => setGoal(event.target.value)}
                            className="min-h-24 w-full resize-none rounded-md bg-transparent p-3 text-sm font-semibold leading-7 outline-none"
                          />
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
                      healthScore={82}
                      opportunityScore={opportunityScore}
                      runway={6}
                      doneTasks={doneTasks}
                      taskCount={tasks.length}
                    />
                  </div>
                </div>

                <KpiRunway reports={fallbackReports} opportunityScore={opportunityScore} />
              </div>
            ) : null}

            {activeTab === "chat" ? (
              <CommandPanel
                session={started ? ({ id: "demo-session" } as never) : null}
                messages={messages}
                input={input}
                loading={loading}
                error=""
                setInput={setInput}
                sendMessage={sendMessage}
              />
            ) : null}

            {activeTab === "agents" ? (
              <AgentBriefing
                reports={fallbackReports}
                selectedReport={null}
                reportExport={null}
                openReport={() => undefined}
              />
            ) : null}

            {activeTab === "tasks" ? (
              <TaskBoard tasks={filteredTasks} taskFilter={taskFilter} setTaskFilter={setTaskFilter} completeTask={completeTask} />
            ) : null}

            {activeTab === "board" ? (
              <BoardTheater
                boardReport={boardReport}
                boardHistory={[]}
                memories={fallbackMemories}
                memoryQuery=""
                memoryResults={[]}
                setMemoryQuery={() => undefined}
                searchMemory={(event) => event.preventDefault()}
                loading={loading}
                session={started ? ({ id: "demo-session" } as never) : null}
                generateBoardMeeting={generateBoardMeeting}
              />
            ) : null}

            {activeTab === "operations" ? (
              <div className="grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
                <OperatingPhases />
                <KpiRunway reports={fallbackReports} opportunityScore={opportunityScore} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Brain, Loader2, Mic, Sparkles } from "lucide-react";
import { api, AgentReport, ChatMessage, DashboardSummary, Memory, ReportExport, Session, Task } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { ExecutiveGraph } from "@/components/sections/executive-graph";
import { CommandPanel } from "@/components/sections/command-panel";
import { AgentBriefing } from "@/components/sections/agent-briefing";
import { TaskBoard } from "@/components/sections/task-board";
import { BoardTheater } from "@/components/sections/board-theater";
import { OperatingPhases } from "@/components/sections/operating-phases";
import { KpiRunway } from "@/components/sections/kpi-runway";
import {
  fallbackMemories,
  fallbackReports,
  fallbackTasks,
  starterPrompts,
  TaskFilter,
} from "@/lib/dashboard-data";

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
  const [boardHistory, setBoardHistory] = useState<AgentReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<AgentReport | null>(null);
  const [reportExport, setReportExport] = useState<ReportExport | null>(null);
  const [memoryQuery, setMemoryQuery] = useState("");
  const [memoryResults, setMemoryResults] = useState<Memory[]>([]);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>("All");

  useEffect(() => {
    async function load() {
      try {
        const summary = await api.dashboard();
        setDashboard(summary);
        if (summary.active_session) {
          setSession(summary.active_session);
          setMessages(await api.getMessages(summary.active_session.id));
          setMemories(await api.getMemories(summary.active_session.id));
          setBoardHistory(await api.getBoardMeetings(summary.active_session.id));
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
  const filteredTasks = activeTasks.filter((task: Task) => {
    if (taskFilter === "Done") return task.status.toLowerCase() === "done";
    if (taskFilter === "Open") return task.status.toLowerCase() !== "done";
    if (taskFilter === "High") return task.priority === "High";
    return true;
  });
  const doneTasks = activeTasks.filter((task: Task) => task.status.toLowerCase() === "done").length;
  const healthScore = session?.health_score ?? 82;
  const runway = session?.runway_months ?? 6;
  const opportunityScore = latestReports.length
    ? Math.round(latestReports.reduce((total, report) => total + report.score, 0) / latestReports.length)
    : 84;

  async function refreshSession(sessionId: string) {
    setDashboard(await api.dashboard());
    setMemories(await api.getMemories(sessionId));
    setBoardHistory(await api.getBoardMeetings(sessionId));
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

  async function openReport(report: AgentReport) {
    if (!report.id) {
      setSelectedReport(report);
      setReportExport(null);
      return;
    }

    setError("");
    try {
      const [freshReport, exported] = await Promise.all([
        api.getReport(report.id),
        api.exportReport(report.id),
      ]);
      setSelectedReport(freshReport);
      setReportExport(exported);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open report.");
    }
  }

  async function searchMemory(event: FormEvent) {
    event.preventDefault();
    if (!session || !memoryQuery.trim()) return;

    setError("");
    try {
      const result = await api.searchMemories(session.id, memoryQuery.trim());
      setMemoryResults(result.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to search memory.");
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

      <div className="relative mx-auto flex max-w-[1540px] flex-col gap-4 px-3 py-3 sm:gap-5 sm:px-6 sm:py-4 lg:px-8">
        <Header booting={booting} loading={loading} hasSession={!!session} onBoardReview={generateBoardMeeting} />

        <section className="grid gap-5 xl:grid-cols-[1.03fr_0.97fr]">
          <div className="glass-strong relative overflow-hidden rounded-lg">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-ember via-accent to-basil" />
            <div className="grid lg:min-h-[620px] lg:grid-cols-[0.92fr_1.08fr]">
              <div className="flex flex-col justify-between border-b border-ink/10 p-4 dark:border-fog/10 sm:p-7 lg:border-b-0 lg:border-r">
                <div>
                  <div className="mb-5 inline-flex max-w-full items-center gap-2 rounded-md border border-ink/10 bg-white/70 px-3 py-2 text-xs font-black shadow-line dark:border-fog/10 dark:bg-white/5 dark:shadow-line-dark sm:text-sm">
                    <Sparkles size={16} className="text-accent" />
                    CEO + 9 specialist agents
                  </div>
                  <h2 className="max-w-xl text-[2.65rem] font-black leading-[0.96] sm:text-6xl">
                    A boardroom that thinks, argues, and executes.
                  </h2>
                  <p className="mt-5 max-w-xl text-base leading-7 text-steel">
                    Give it capital, a rough idea, or a weak assumption. The AI CEO coordinates specialists,
                    challenges the strategy, creates proof tasks, stores memory, and runs board reviews.
                  </p>
                </div>

                <form onSubmit={startSession} className="mt-8 space-y-3">
                  <div className="rounded-lg border border-ink/10 bg-white/75 p-2 shadow-line dark:border-fog/10 dark:bg-white/5 dark:shadow-line-dark">
                    <textarea
                      value={goal}
                      onChange={(event) => setGoal(event.target.value)}
                      className="min-h-32 w-full resize-none rounded-md bg-transparent p-3 text-sm font-semibold leading-7 outline-none sm:text-base"
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
          <AgentBriefing
            reports={latestReports.length ? latestReports : fallbackReports}
            selectedReport={selectedReport}
            reportExport={reportExport}
            openReport={openReport}
          />
          <div className="grid gap-5 lg:grid-cols-2">
            <TaskBoard tasks={filteredTasks} taskFilter={taskFilter} setTaskFilter={setTaskFilter} completeTask={completeTask} />
            <BoardTheater
              boardReport={boardReport}
              boardHistory={boardHistory}
              memories={memories.length ? memories.slice(0, 4) : fallbackMemories}
              memoryQuery={memoryQuery}
              memoryResults={memoryResults}
              setMemoryQuery={setMemoryQuery}
              searchMemory={searchMemory}
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

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Brain, Loader2, Mic, Sparkles } from "lucide-react";
import { api, AgentReport, ChatMessage, DashboardSummary, Memory, ReportExport, Session, Task, streamMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { DashboardTopbar } from "@/components/dashboard-topbar";
import { ExecutiveGraph } from "@/components/sections/executive-graph";
import { MetroHome } from "@/components/dashboard/metro-home";
import { MetroSectionShell } from "@/components/dashboard/metro-section-shell";
import { CommandPanel } from "@/components/sections/command-panel";
import { AgentBriefing } from "@/components/sections/agent-briefing";
import { TaskBoard } from "@/components/sections/task-board";
import { BoardTheater } from "@/components/sections/board-theater";
import { OperatingPhases } from "@/components/sections/operating-phases";
import { KpiRunway } from "@/components/sections/kpi-runway";
import { clearSession, getStoredUser, isDemoSession } from "@/lib/auth";
import {
  DashboardTab,
  demoBoardMeeting,
  demoBoardReply,
  fallbackMemories,
  fallbackReports,
  fallbackTasks,
  starterPrompts,
  TaskFilter,
} from "@/lib/dashboard-data";

const TAB_TITLES: Record<DashboardTab, string> = {
  chat: "Chat with the CEO",
  agents: "Agent briefing",
  tasks: "Task board",
  board: "Board & memory",
  operations: "Operations",
};

export default function DashboardPage() {
  const router = useRouter();
  const [isDemo] = useState(() => isDemoSession());
  const [activeTab, setActiveTab] = useState<DashboardTab | null>(null);
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
  const [demoTasks, setDemoTasks] = useState<Task[]>(fallbackTasks);

  useEffect(() => {
    async function load() {
      if (isDemo) {
        setBooting(false);
        return;
      }
      try {
        const summary = await api.dashboard();
        setDashboard(summary);
        if (summary.active_session) {
          const sessionId = summary.active_session.id;
          setSession(summary.active_session);
          const [msgs, mems, history] = await Promise.all([
            api.getMessages(sessionId),
            api.getMemories(sessionId),
            api.getBoardMeetings(sessionId),
          ]);
          setMessages(msgs);
          setMemories(mems);
          setBoardHistory(history);
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

  const activeTasks = isDemo ? demoTasks : dashboard?.tasks ?? fallbackTasks;
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
    const [summary, mems, history] = await Promise.all([
      api.dashboard(),
      api.getMemories(sessionId),
      api.getBoardMeetings(sessionId),
    ]);
    setDashboard(summary);
    setMemories(mems);
    setBoardHistory(history);
  }

  async function startSession(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError("");

    if (isDemo) {
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: goal,
        created_at: new Date().toISOString(),
      };
      window.setTimeout(() => {
        const reply: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: demoBoardReply,
          created_at: new Date().toISOString(),
          reports: fallbackReports,
        };
        setMessages((current) => [...current, reply]);
        setLoading(false);
      }, 700);
      setMessages([userMessage]);
      setInput("");
      setActiveTab("chat");
      return;
    }

    try {
      const created = await api.createSession(goal);
      setSession(created);
      const firstMessage = await api.sendMessage(created.id, goal);
      setMessages([firstMessage]);
      await refreshSession(created.id);
      setInput("");
      setActiveTab("chat");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function startNewSessionFromHome() {
    setSession(null);
    setMessages([]);
    setBoardReport(null);
    setSelectedReport(null);
    setReportExport(null);
    setInput("");
    setError("");
    setActiveTab("chat");
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    if (!input.trim()) return;

    if (!session && !isDemo) {
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

    const assistantId = crypto.randomUUID();
    const placeholder: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
      reports: [],
    };

    setMessages((current) => [...current, optimistic, placeholder]);
    const contentToSend = input;
    setInput("");

    if (isDemo) {
      setLoading(true);
      window.setTimeout(() => {
        const reply: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: demoBoardReply,
          created_at: new Date().toISOString(),
          reports: fallbackReports,
        };
        setMessages((current) => [...current, reply]);
        setLoading(false);
      }, 700);
      return;
    }

    setLoading(true);
    setError("");

    try {
      await streamMessage(session!.id, contentToSend, (streamEvent) => {
        if (streamEvent.type === "agent_report") {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, reports: [...(message.reports ?? []), streamEvent.report] }
                : message,
            ),
          );
        } else if (streamEvent.type === "done") {
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, id: streamEvent.message_id, content: streamEvent.final }
                : message,
            ),
          );
        } else if (streamEvent.type === "error") {
          setError(streamEvent.message);
        }
      });
      await refreshSession(session!.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setMessages((current) => current.filter((message) => message.id !== assistantId));
    } finally {
      setLoading(false);
    }
  }

  async function completeTask(taskId: string) {
    setError("");

    if (isDemo) {
      setDemoTasks((current) =>
        current.map((task) => (task.id === taskId ? { ...task, status: "Done", completed_at: new Date().toISOString() } : task)),
      );
      return;
    }

    try {
      await api.updateTask(taskId, "Done");
      setDashboard(await api.dashboard());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update task.");
    }
  }

  async function generateBoardMeeting() {
    if (isDemo) {
      setLoading(true);
      window.setTimeout(() => {
        setBoardReport(demoBoardMeeting);
        setBoardHistory((current) => [demoBoardMeeting, ...current]);
        speak(`${demoBoardMeeting.title}. ${demoBoardMeeting.summary}. ${demoBoardMeeting.bullets.join(". ")}`);
        setActiveTab("board");
        setLoading(false);
      }, 700);
      return;
    }

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
      setActiveTab("board");
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
    if (!memoryQuery.trim()) return;

    if (isDemo) {
      const query = memoryQuery.trim().toLowerCase();
      setMemoryResults(fallbackMemories.filter((memory) => memory.content.toLowerCase().includes(query)));
      return;
    }

    if (!session) return;

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


  function logout() {
    clearSession();
    router.push("/");
  }

  return (
    <main className="relative flex h-[100dvh] min-h-[560px] overflow-hidden bg-radial-ui p-2.5 text-ink sm:p-3.5 lg:p-4">
      <div className="scanline pointer-events-none absolute inset-0" />

      <div className="relative flex h-full w-full">
        {activeTab === null ? (
          <MetroHome
            user={getStoredUser()}
            isDemo={isDemo}
            onLogout={logout}
            onSelectTab={setActiveTab}
            onStartNewSession={startNewSessionFromHome}
            healthScore={healthScore}
            runway={runway}
            doneTasks={doneTasks}
            taskCount={activeTasks.length}
          />
        ) : (
          <MetroSectionShell
            title={TAB_TITLES[activeTab]}
            booting={booting}
            loading={loading}
            hasSession={!!session || isDemo}
            isDemo={isDemo}
            error={error}
            onBoardReview={generateBoardMeeting}
            onBack={() => setActiveTab(null)}
          >
            {activeTab === "chat" ? (
              <CommandPanel
                session={session}
                messages={messages}
                input={input}
                loading={loading}
                error={error}
                setInput={setInput}
                sendMessage={sendMessage}
              />
            ) : null}

            {activeTab === "agents" ? (
              <AgentBriefing
                reports={latestReports.length ? latestReports : fallbackReports}
                selectedReport={selectedReport}
                reportExport={reportExport}
                openReport={openReport}
              />
            ) : null}

            {activeTab === "tasks" ? (
              <TaskBoard tasks={filteredTasks} taskFilter={taskFilter} setTaskFilter={setTaskFilter} completeTask={completeTask} />
            ) : null}

            {activeTab === "board" ? (
              <BoardTheater
                boardReport={boardReport}
                boardHistory={boardHistory}
                memories={memories.length ? memories.slice(0, 4) : fallbackMemories}
                memoryQuery={memoryQuery}
                memoryResults={memoryResults}
                setMemoryQuery={setMemoryQuery}
                searchMemory={searchMemory}
                loading={loading}
                canRunBoard={!!session || isDemo}
                generateBoardMeeting={generateBoardMeeting}
              />
            ) : null}

            {activeTab === "operations" ? (
              <div className="grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
                <OperatingPhases />
                <KpiRunway reports={latestReports.length ? latestReports : fallbackReports} opportunityScore={opportunityScore} />
              </div>
            ) : null}
          </MetroSectionShell>
        )}
      </div>
    </main>
  );
}

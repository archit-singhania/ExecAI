"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, AgentReport, DashboardSummary, Memory, Session, Task } from "@/lib/api";
import {
  fallbackMemories,
  fallbackReports,
  fallbackTasks,
  TaskFilter,
} from "@/lib/dashboard-data";

export type DashboardData = {
  isDemo: boolean;
  booting: boolean;
  error: string;
  session: Session | null;
  dashboard: DashboardSummary | null;
  memories: Memory[];
  boardHistory: AgentReport[];
  tasks: Task[];
  filteredTasks: Task[];
  doneTasks: number;
  reports: AgentReport[];
  healthScore: number;
  runway: number;
  opportunityScore: number;
  setSession: (session: Session | null) => void;
  setDashboard: (summary: DashboardSummary | null) => void;
  setDemoTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  setMemories: (memories: Memory[]) => void;
  setBoardHistory: React.Dispatch<React.SetStateAction<AgentReport[]>>;
  setError: (message: string) => void;
  refresh: (sessionId: string) => Promise<void>;
};

export function useDashboardData(
  isDemo: boolean,
  taskFilter: TaskFilter,
  liveReports: AgentReport[],
): DashboardData {
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [boardHistory, setBoardHistory] = useState<AgentReport[]>([]);
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

          const [mems, history] = await Promise.all([
            api.getMemories(sessionId),
            api.getBoardMeetings(sessionId),
          ]);
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
  }, [isDemo]);

  const refresh = useCallback(async (sessionId: string) => {
    const [summary, mems, history] = await Promise.all([
      api.dashboard(),
      api.getMemories(sessionId),
      api.getBoardMeetings(sessionId),
    ]);
    setDashboard(summary);
    setMemories(mems);
    setBoardHistory(history);
  }, []);

  const tasks = isDemo ? demoTasks : dashboard?.tasks ?? fallbackTasks;

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (taskFilter === "Done") return task.status.toLowerCase() === "done";
        if (taskFilter === "Open") return task.status.toLowerCase() !== "done";
        if (taskFilter === "High") return task.priority === "High";
        return true;
      }),
    [tasks, taskFilter],
  );

  const doneTasks = useMemo(
    () => tasks.filter((task) => task.status.toLowerCase() === "done").length,
    [tasks],
  );

  const reports = useMemo(() => {
    if (liveReports.length) return liveReports;
    if (dashboard?.reports?.length) return dashboard.reports;
    return fallbackReports;
  }, [liveReports, dashboard]);

  const healthScore = session?.health_score ?? 82;
  const runway = session?.runway_months ?? 6;

  const opportunityScore = useMemo(
    () =>
      reports.length
        ? Math.round(reports.reduce((total, report) => total + report.score, 0) / reports.length)
        : 84,
    [reports],
  );

  return {
    isDemo,
    booting,
    error,
    session,
    dashboard,
    memories: memories.length ? memories : fallbackMemories,
    boardHistory,
    tasks,
    filteredTasks,
    doneTasks,
    reports,
    healthScore,
    runway,
    opportunityScore,
    setSession,
    setDashboard,
    setDemoTasks,
    setMemories,
    setBoardHistory,
    setError,
    refresh,
  };
}

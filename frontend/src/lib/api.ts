export type AgentReport = {
  id?: string | null;
  agent: string;
  report_type?: string;
  title: string;
  summary: string;
  bullets: string[];
  score: number;
  created_at?: string | null;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  reports?: AgentReport[];
};

export type Session = {
  id: string;
  title: string;
  business_goal: string;
  health_score: number;
  runway_months: number;
  created_at: string;
  updated_at: string;
};

export type DashboardSummary = {
  active_session: Session | null;
  recommendations: string[];
  tasks: Task[];
  reports: AgentReport[];
};

export type Task = {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  created_by_agent: string;
  completed_at: string | null;
};

export type Memory = {
  id: string;
  kind: string;
  content: string;
  importance: number;
  created_at: string;
};

export type ReportExport = {
  id: string;
  filename: string;
  markdown: string;
};

export type MemorySearch = {
  query: string;
  results: Memory[];
};

export type CEOResponse = {
  message: ChatMessage;
  recommendation: string;
  health_score: number;
  tasks: string[];
  agents: Array<{
    name: string;
    confidence: number;
    verdict: string;
  }>;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function authHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("ceoai-auth-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const isMutation = !!options?.method && options.method !== "GET";
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...(options?.headers ?? {}),
    },
    // Mutations must always hit the server fresh. GETs can reuse a very
    // recent response instead of forcing a full round-trip on every render.
    cache: isMutation ? "no-store" : options?.cache ?? "default",
  });

  if (response.status === 401) {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("ceoai-auth-token");
      window.localStorage.removeItem("ceoai-auth-user");
      window.location.href = "/login";
    }
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>("/health"),
  createSession: (business_goal: string) =>
    request<Session>("/api/sessions", {
      method: "POST",
      body: JSON.stringify({ business_goal }),
    }),
  listSessions: () => request<Session[]>("/api/sessions"),
  getMessages: (sessionId: string) =>
    request<ChatMessage[]>(`/api/sessions/${sessionId}/messages`),
  getReports: (sessionId: string) =>
    request<AgentReport[]>(`/api/sessions/${sessionId}/reports`),
  getReport: (reportId: string) =>
    request<AgentReport>(`/api/reports/${reportId}`),
  exportReport: (reportId: string) =>
    request<ReportExport>(`/api/reports/${reportId}/export`),
  getBoardMeetings: (sessionId: string) =>
    request<AgentReport[]>(`/api/sessions/${sessionId}/board-meetings`),
  getTasks: (sessionId: string) =>
    request<Task[]>(`/api/sessions/${sessionId}/tasks`),
  updateTask: (taskId: string, status: string) =>
    request<Task>(`/api/tasks/${taskId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  getMemories: (sessionId: string) =>
    request<Memory[]>(`/api/sessions/${sessionId}/memories`),
  searchMemories: (sessionId: string, query: string) =>
    request<MemorySearch>(`/api/sessions/${sessionId}/memories/search?q=${encodeURIComponent(query)}`),
  generateBoardMeeting: (sessionId: string) =>
    request<AgentReport>(`/api/sessions/${sessionId}/board-meeting`, {
      method: "POST",
    }),
  sendMessage: (sessionId: string, content: string) =>
    request<ChatMessage>(`/api/sessions/${sessionId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  dashboard: () => request<DashboardSummary>("/api/dashboard"),
};

export async function createSession() {
  return api.createSession(
    "I have Rs 2 lakh and want to start an online business. Give me the strongest opportunity and challenge weak assumptions."
  );
}

export async function sendMessage(sessionId: string, content: string): Promise<CEOResponse> {
  const message = await api.sendMessage(sessionId, content);
  const summary = await api.dashboard();

  return {
    message,
    recommendation: message.content,
    health_score: summary.active_session?.health_score ?? 78,
    tasks: summary.tasks.map((task) => task.title),
    agents: (message.reports ?? []).map((report) => ({
      name: report.agent.replace(" Research", ""),
      confidence: report.score,
      verdict: report.title,
    })),
  };
}

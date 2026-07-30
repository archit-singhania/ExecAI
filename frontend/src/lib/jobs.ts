import { AgentReport } from "@/lib/api";
import { getToken } from "@/lib/auth";

export type JobStatus = "queued" | "running" | "done" | "failed";

export type JobState = {
  id: string;
  status: JobStatus;
  progress_current: number;
  progress_total: number;
  progress_label: string;
  error: string | null;
  final: string;
  message_id: string | null;
  reports: AgentReport[];
  updated_at: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = `Request failed: ${response.status}`;
    try {
      const parsed = await response.json();
      if (typeof parsed.detail === "string") detail = parsed.detail;
    } catch {
      /* keep status message */
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export const jobsApi = {
  startBoardRun: (sessionId: string, content: string) =>
    request<{ job_id: string; status: JobStatus; already_running: boolean }>(
      `/api/jobs/board-run/${sessionId}`,
      { method: "POST", body: JSON.stringify({ content }) },
    ),

  get: (jobId: string) => request<JobState>(`/api/jobs/${jobId}`),
};

export async function pollJob(
  jobId: string,
  onUpdate: (state: JobState) => void,
  options: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<JobState> {
  const interval = options.intervalMs ?? 1200;
  const timeout = options.timeoutMs ?? 5 * 60 * 1000;
  const started = Date.now();

  for (;;) {
    const state = await jobsApi.get(jobId);
    onUpdate(state);

    if (state.status === "done") return state;
    if (state.status === "failed") {
      throw new Error(state.error || "The board run failed.");
    }

    if (Date.now() - started > timeout) {
      throw new Error("The board is taking longer than expected. Check back shortly.");
    }

    await new Promise((resolve) => window.setTimeout(resolve, interval));
  }
}

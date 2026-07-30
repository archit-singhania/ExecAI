import { getToken } from "@/lib/auth";

export type PredictionStatus = "pending" | "hit" | "missed" | "void";

export type Prediction = {
  id: string;
  agent: string;
  statement: string;
  confidence: number;
  due_at: string;
  status: PredictionStatus;
  resolved_at: string | null;
  note: string | null;
  overdue: boolean;
  days_remaining: number;
};

export type AgentCalibration = {
  agent: string;
  hit: number;
  missed: number;
  pending: number;
  resolved: number;
  accuracy: number | null;
};

export type Calibration = {
  agents: AgentCalibration[];
  overall: number | null;
  resolved_total: number;
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

export const predictionsApi = {
  list: (status?: PredictionStatus) =>
    request<{ predictions: Prediction[] }>(
      `/api/predictions${status ? `?status=${status}` : ""}`,
    ),

  calibration: () => request<Calibration>("/api/predictions/calibration"),

  resolve: (id: string, status: "hit" | "missed" | "void", note?: string) =>
    request<Prediction>(`/api/predictions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, note: note ?? null }),
    }),
};

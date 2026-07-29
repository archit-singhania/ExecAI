import { getToken } from "@/lib/auth";

export type Plan = {
  id: string;
  name: string;
  price_eur: number;
  tagline: string;
  features: string[];
  agent_limit: number;
  session_limit: number;
  monthly_runs: number;
  scheduled_reviews: boolean;
  exports: boolean;
  workspaces: boolean;
  white_label: boolean;
  api_access: boolean;
};

export type PlanList = {
  currency: string;
  billing_enabled: boolean;
  plans: Plan[];
};

export type Subscription = {
  tier: string;
  name: string;
  price_eur: number;
  status: string | null;
  ends_at: string | null;
  runs_used: number;
  runs_included: number;
  period_started_at: string | null;
  manageable: boolean;
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
      /* keep the status-based message */
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export const billingApi = {
  plans: () => request<PlanList>("/api/billing/plans"),
  me: () => request<Subscription>("/api/billing/me"),
  checkout: (tier: string) =>
    request<{ url: string | null }>(`/api/billing/checkout?tier=${encodeURIComponent(tier)}`, {
      method: "POST",
    }),
  portal: () => request<{ url: string | null }>("/api/billing/portal", { method: "POST" }),
};

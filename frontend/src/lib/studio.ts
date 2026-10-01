import { getToken } from "@/lib/auth";
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export async function studioRequest<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const token = getToken();
  const multipart = body instanceof FormData;
  const r = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    headers: {
      ...(multipart ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : multipart ? body : JSON.stringify(body),
    cache: "no-store",
  });
  if (!r.ok) {
    const value = await r.json().catch(() => ({}));
    throw new Error(
      typeof value.detail === "string"
        ? value.detail
        : `Unable to complete request (${r.status}).`,
    );
  }
  return r.json() as Promise<T>;
}
export type StudioRecord = {
  id: string;
  session_id: string;
  kind: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  version: number;
  created_at: string;
  updated_at: string;
};
export type Workspace = {
  id: string;
  title: string;
  business_goal: string;
  archived: boolean;
  owned: boolean;
  health_score: number;
};
export type StudioTask = {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  due_at?: string;
  assignee_id?: string;
  dependencies?: string[];
};

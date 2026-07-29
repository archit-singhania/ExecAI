import { AuthUser, getToken } from "@/lib/auth";

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
      /* fall back to the status message */
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export const accountApi = {
  updateProfile: (name: string) =>
    request<AuthUser>("/api/account/profile", {
      method: "PATCH",
      body: JSON.stringify({ name }),
    }),

  changePassword: (currentPassword: string, newPassword: string) =>
    request<{ detail: string }>("/api/account/password", {
      method: "POST",
      body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
    }),

  exportData: () => request<Record<string, unknown>>("/api/account/export"),

  deleteAccount: (password: string, confirmation: string) =>
    request<{ detail: string }>("/api/account", {
      method: "DELETE",
      body: JSON.stringify({ password, confirmation }),
    }),
};

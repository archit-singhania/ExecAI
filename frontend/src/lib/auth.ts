const TOKEN_KEY = "ceoai-auth-token";
const USER_KEY = "ceoai-auth-user";
const DEMO_KEY = "ceoai-demo-session";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  created_at: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AuthUser;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function authRequest<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    let detail = `Request failed: ${response.status}`;
    try {
      const parsed = await response.json();
      if (typeof parsed.detail === "string") detail = parsed.detail;
    } catch {
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function storeSession(auth: AuthResponse) {
  window.localStorage.setItem(TOKEN_KEY, auth.access_token);
  window.localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
}

export function clearSession() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
  window.localStorage.removeItem(DEMO_KEY);
}

export function startDemoSession() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_KEY, "1");
}

export function isDemoSession(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DEMO_KEY) === "1";
}

export function clearDemoSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEMO_KEY);
}

export const authApi = {
  signup: (name: string, email: string, password: string) =>
    authRequest<AuthResponse>("/api/auth/signup", { name, email, password }),
  login: (email: string, password: string) =>
    authRequest<AuthResponse>("/api/auth/login", { email, password }),
};

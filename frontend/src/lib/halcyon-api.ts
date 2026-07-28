export type HalcyonWorldId =
  | "zen_garden"
  | "ocean_dusk"
  | "old_forest"
  | "rain_cabin"
  | "nordic_lake"
  | "blossom_park"
  | "desert_oasis"
  | "observatory";

export type HalcyonEnvironment = {
  world: HalcyonWorldId;
  time_of_day: number;
  weather: string;
  wind: number;
  water_motion: number;
  fog: number;
  brightness: number;
  warmth: number;
  bloom: number;
  ambience: string;
  ambience_volume: number;
  music: string;
  music_volume: number;
  companion: string;
  companion_action: string;
  breathing_guide: boolean;
  breathing_pace_seconds: number;
  transition_seconds: number;
  reason: string;
};

export type HalcyonAffect = {
  label: string;
  valence: number;
  arousal: number;
  confidence: number;
  matched: string[];
};

export type HalcyonSession = {
  id: string;
  world: HalcyonWorldId;
  started_at: string;
  ended_at: string | null;
  turn_count: number;
  environment: HalcyonEnvironment | null;
};

export type HalcyonTurn = {
  reply: string;
  affect: HalcyonAffect;
  environment: HalcyonEnvironment;
  turn_index: number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function authHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("ceoai-auth-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader(),
      ...(options?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const halcyon = {
  startSession: (world: HalcyonWorldId, consentToStore: boolean) =>
    request<HalcyonSession>("/api/halcyon/sessions", {
      method: "POST",
      body: JSON.stringify({ world, consent_to_store: consentToStore }),
    }),

  takeTurn: (sessionId: string, text: string) =>
    request<HalcyonTurn>(`/api/halcyon/sessions/${sessionId}/turn`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  endSession: (sessionId: string) =>
    request<HalcyonSession>(`/api/halcyon/sessions/${sessionId}/end`, {
      method: "POST",
    }),

  deleteSession: (sessionId: string) =>
    request<{ deleted: string }>(`/api/halcyon/sessions/${sessionId}`, {
      method: "DELETE",
    }),

  deleteEverything: () =>
    request<{ deleted: number }>("/api/halcyon/sessions", { method: "DELETE" }),
};

export function pixelStreamUrl(): string {
  return process.env.NEXT_PUBLIC_PIXEL_STREAM_URL ?? "http://127.0.0.1";
}

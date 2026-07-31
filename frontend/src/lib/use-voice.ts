"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getToken } from "@/lib/auth";

export type VoicePreset = "boardroom" | "halcyon" | "crisis";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Capabilities = {
  server_tts: boolean;
  server_stt: boolean;
  provider: string | null;
  language: string;
};

export function useVoice() {
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!getToken()) return;

    fetch(`${API_URL}/api/speech/capabilities`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then(setCapabilities)
      .catch(() => undefined);
  }, []);

  const release = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const cancel = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    release();
    setSpeaking(false);
  }, [release]);

  const browserSpeak = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      onEnd?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;

    const preferred = window.speechSynthesis
      .getVoices()
      .find((voice) => /en-IN|en_IN/i.test(voice.lang));
    if (preferred) utterance.voice = preferred;

    utterance.onend = () => {
      setSpeaking(false);
      onEnd?.();
    };
    utterance.onerror = () => {
      setSpeaking(false);
      onEnd?.();
    };

    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, []);

  const speak = useCallback(
    async (text: string, preset: VoicePreset = "boardroom", onEnd?: () => void) => {
      cancel();

      const trimmed = text.trim();
      if (!trimmed) {
        onEnd?.();
        return;
      }

      if (!capabilities?.server_tts) {
        browserSpeak(trimmed, onEnd);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/speech/speak`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ text: trimmed, preset }),
        });

        if (!response.ok) throw new Error("tts failed");
        const body = await response.json();
        if (!body.available || !body.audio_base64) throw new Error("tts unavailable");

        const binary = atob(body.audio_base64);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }

        const blob = new Blob([bytes], { type: body.mime_type ?? "audio/wav" });
        const url = URL.createObjectURL(blob);
        urlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          setSpeaking(false);
          release();
          onEnd?.();
        };
        audio.onerror = () => {
          setSpeaking(false);
          release();
          browserSpeak(trimmed, onEnd);
        };

        setSpeaking(true);
        await audio.play();
      } catch {
        browserSpeak(trimmed, onEnd);
      }
    },
    [browserSpeak, cancel, capabilities, release],
  );

  useEffect(() => cancel, [cancel]);

  return {
    speak,
    cancel,
    speaking,
    supported: true,
    serverVoice: !!capabilities?.server_tts,
    provider: capabilities?.provider ?? "browser",
  };
}

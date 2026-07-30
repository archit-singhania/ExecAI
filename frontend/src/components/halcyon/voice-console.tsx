"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ArrowUp, Keyboard, Loader2, Mic, Square, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export function VoiceConsole({
  state,
  transcript,
  supported,
  spoken,
  busy,
  onToggleMic,
  onToggleSpoken,
  onSubmitText,
}: {
  state: VoiceState;
  transcript: string;
  supported: boolean;
  spoken: boolean;
  busy: boolean;
  onToggleMic: () => void;
  onToggleSpoken: () => void;
  onSubmitText: (value: string) => void;
}) {
  const [typing, setTyping] = useState(!supported);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typing) inputRef.current?.focus();
  }, [typing]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    setText("");
    onSubmitText(value);
  }

  const label =
    state === "listening"
      ? "Listening"
      : state === "thinking"
        ? "The world is answering"
        : state === "speaking"
          ? "Speaking"
          : supported
            ? "Tap to speak"
            : "Type below";

  return (
    <div className="vc">
      <div className="vc-primary">
        <button
          type="button"
          onClick={onToggleMic}
          disabled={!supported || busy}
          aria-label={state === "listening" ? "Stop listening" : "Speak"}
          className={cn("vc-orb", `vc-orb-${state}`)}
        >
          <span className="vc-ring vc-ring-3" />
          <span className="vc-ring vc-ring-2" />
          <span className="vc-ring vc-ring-1" />
          <span className="vc-core">
            {state === "thinking" ? (
              <Loader2 size={30} className="animate-spin" />
            ) : state === "speaking" ? (
              <Volume2 size={30} />
            ) : state === "listening" ? (
              <Square size={24} strokeWidth={2.4} />
            ) : (
              <Mic size={30} />
            )}
          </span>
        </button>

        <p className="vc-label">
          <span className={cn("vc-dot", `vc-dot-${state}`)} />
          {label}
        </p>

        {transcript ? <p className="vc-transcript">{transcript}</p> : null}
      </div>

      <div className="vc-secondary">
        <button type="button" onClick={onToggleSpoken} className="vc-chip" aria-pressed={spoken}>
          {spoken ? <Volume2 size={13} /> : <VolumeX size={13} />}
          {spoken ? "Spoken" : "Silent"}
        </button>

        {supported ? (
          <button
            type="button"
            onClick={() => setTyping((current) => !current)}
            className="vc-chip"
            aria-expanded={typing}
          >
            <Keyboard size={13} />
            {typing ? "Hide keyboard" : "Type instead"}
          </button>
        ) : null}
      </div>

      {typing ? (
        <form onSubmit={submit} className="vc-composer">
          <input
            ref={inputRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={busy ? "The world is answering…" : "Say it in writing"}
            disabled={busy}
            className="vc-input"
          />
          <button type="submit" disabled={!text.trim() || busy} className="vc-send" aria-label="Send">
            <ArrowUp size={16} strokeWidth={2.6} />
          </button>
        </form>
      ) : null}
    </div>
  );
}

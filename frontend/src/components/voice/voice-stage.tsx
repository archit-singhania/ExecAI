"use client";

import { FormEvent, forwardRef, useImperativeHandle, useRef, useState } from "react";
import { ArrowUp, Loader2, Mic, Square, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import { useSpeechSynthesis } from "@/lib/use-speech-synthesis";

export type VoiceStageStatus = "idle" | "listening" | "thinking" | "speaking";

export type VoiceStageProps = {
  subtitle?: string;
  placeholderPrompt?: string;
  onUtterance: (text: string, onProgress: (label: string) => void) => Promise<string>;
  disabled?: boolean;
  autoListen?: boolean;
};

export type VoiceStageHandle = {
  submit: (text: string) => void;
};

export const VoiceStage = forwardRef<VoiceStageHandle, VoiceStageProps>(function VoiceStage(
  {
    subtitle,
    placeholderPrompt = "Tap the mic and tell your CEO what's on your mind.",
    onUtterance,
    disabled,
    autoListen = true,
  }: VoiceStageProps,
  ref,
) {
  const recognition = useSpeechRecognition();
  const synthesis = useSpeechSynthesis();

  const [status, setStatus] = useState<VoiceStageStatus>("idle");
  const [caption, setCaption] = useState("");
  const [progressLabel, setProgressLabel] = useState("");
  const [muted, setMuted] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [error, setError] = useState("");
  const handsFreeRef = useRef(autoListen);
  handsFreeRef.current = autoListen;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  function startListening() {
    if (disabled) return;
    synthesis.cancel();
    setError("");
    setCaption("");
    setProgressLabel("");
    setStatus("listening");
    recognition.start((finalText) => {
      void handleUtterance(finalText);
    });
  }

  async function handleUtterance(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      setStatus("idle");
      return;
    }
    setStatus("thinking");
    setProgressLabel("");
    setError("");

    try {
      const reply = await onUtterance(trimmed, (label) => setProgressLabel(label));
      setCaption(reply);

      if (mutedRef.current || !synthesis.supported) {
        setStatus("idle");
        if (handsFreeRef.current && !mutedRef.current) startListening();
        return;
      }

      setStatus("speaking");
      synthesis.speak(reply, () => {
        setStatus("idle");
        if (handsFreeRef.current) startListening();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("idle");
    }
  }

  useImperativeHandle(ref, () => ({
    submit: (text: string) => {
      if (disabled) return;
      void handleUtterance(text);
    },
  }));

  function handleMicClick() {
    if (status === "listening") {
      recognition.stop();
      return;
    }
    if (status === "speaking") {
      synthesis.cancel();
      setStatus("idle");
      return;
    }
    if (status === "thinking") return;
    startListening();
  }

  function submitText(event: FormEvent) {
    event.preventDefault();
    const value = textInput.trim();
    if (!value || status === "thinking") return;
    setTextInput("");
    void handleUtterance(value);
  }

  const statusLabel =
    status === "listening"
      ? "Listening"
      : status === "thinking"
        ? progressLabel || "The floor is deliberating"
        : status === "speaking"
          ? "Speaking"
          : "Ready";

  const busy = status === "thinking";

  return (
    <div className="voice-stage relative flex h-full min-h-[440px] flex-col px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="sec-eyebrow">Command channel</p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-[0.85rem] font-bold tracking-[-0.01em]">{subtitle}</p>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setMuted((current) => !current)}
          aria-pressed={muted}
          className="voice-chip"
          title={muted ? "Spoken replies are off" : "Spoken replies are on"}
        >
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          <span className="hidden sm:inline">{muted ? "Silent" : "Spoken"}</span>
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-7 py-6">
        <button
          type="button"
          onClick={handleMicClick}
          disabled={disabled}
          aria-label={status === "listening" ? "Stop listening" : "Talk to the CEO"}
          className={cn("voice-orb", `voice-orb-${status}`)}
        >
          <span className="voice-orb-ring voice-orb-ring-outer" />
          <span className="voice-orb-ring voice-orb-ring-inner" />
          <span className="voice-orb-core">
            {status === "thinking" ? (
              <Loader2 size={26} className="animate-spin" />
            ) : status === "speaking" ? (
              <Volume2 size={26} />
            ) : status === "listening" ? (
              <Square size={22} strokeWidth={2.4} />
            ) : (
              <Mic size={26} />
            )}
          </span>
        </button>

        <div className="flex items-center gap-2">
          <span className={cn("voice-status-dot", `voice-status-dot-${status}`)} />
          <p className="sec-eyebrow">{statusLabel}</p>
        </div>

        <div className="max-w-xl text-center">
          <p
            className={cn(
              "min-h-[4rem] text-balance text-[1.05rem] font-semibold leading-8 tracking-[-0.01em] transition-opacity duration-300 sm:text-lg",
              caption ? "text-ink" : "text-steel",
            )}
          >
            {caption || placeholderPrompt}
          </p>

          {error ? (
            <p className="mt-3 rounded-md bg-ember/10 px-3 py-2 text-[0.8rem] font-bold text-ember">{error}</p>
          ) : null}

          {!recognition.supported ? (
            <p className="mt-3 text-[0.75rem] font-semibold text-steel">
              Voice input isn&apos;t supported in this browser — type below instead.
            </p>
          ) : null}
        </div>
      </div>

      <form onSubmit={submitText} className="mx-auto w-full max-w-xl">
        <div className="voice-composer flex items-center gap-2 rounded-xl p-1.5">
          <input
            value={textInput}
            onChange={(event) => setTextInput(event.target.value)}
            placeholder={busy ? "The board is working…" : "Or type your message…"}
            disabled={busy}
            className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[0.88rem] font-semibold outline-none placeholder:text-steel/70 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || busy}
            aria-label="Send message"
            className="voice-send"
          >
            <ArrowUp size={16} strokeWidth={2.6} />
          </button>
        </div>
      </form>
    </div>
  );
});

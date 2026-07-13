"use client";

import { FormEvent, forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Keyboard, Loader2, Mic, MicOff, Volume2 } from "lucide-react";
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

export const VoiceStage = forwardRef<VoiceStageHandle, VoiceStageProps>(function VoiceStage({
  subtitle,
  placeholderPrompt = "Tap the mic and tell your CEO what's on your mind.",
  onUtterance,
  disabled,
  autoListen = true,
}: VoiceStageProps, ref) {
  const recognition = useSpeechRecognition();
  const synthesis = useSpeechSynthesis();

  const [status, setStatus] = useState<VoiceStageStatus>("idle");
  const [caption, setCaption] = useState("");
  const [progressLabel, setProgressLabel] = useState("");
  const [muted, setMuted] = useState(false);
  const [showTextFallback, setShowTextFallback] = useState(false);
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
      ? "Listening…"
      : status === "thinking"
        ? progressLabel || "Thinking…"
        : status === "speaking"
          ? "Speaking…"
          : "Tap to talk";

  return (
    <div className="relative flex h-full min-h-[420px] flex-col items-center justify-center gap-6 overflow-hidden rounded-lg px-4 py-8">
      {subtitle ? (
        <p className="absolute top-4 text-center text-xs font-black uppercase tracking-[0.22em] text-steel">
          {subtitle}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleMicClick}
        disabled={disabled}
        aria-label={status === "listening" ? "Stop listening" : "Talk to the CEO"}
        className="group relative flex h-40 w-40 shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-50 sm:h-48 sm:w-48"
      >
        <span
          className={cn(
            "absolute inset-0 rounded-full border-2 transition-all duration-500",
            status === "listening" && "animate-ping-slow border-basil/60",
            status === "thinking" && "animate-spin-slow border-dashed border-accent/70",
            status === "speaking" && "animate-pulse-fast border-ember/60",
            status === "idle" && "border-ink/15",
          )}
        />
        <span
          className={cn(
            "absolute inset-4 rounded-full transition-all duration-500",
            status === "listening" && "scale-105 bg-basil/15",
            status === "thinking" && "bg-accent/15",
            status === "speaking" && "scale-105 bg-ember/15",
            status === "idle" && "bg-ink/5",
          )}
        />
        <span className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-ink text-fog shadow-line dark:shadow-line-dark sm:h-24 sm:w-24">
          {status === "thinking" ? (
            <Loader2 size={28} className="animate-spin" />
          ) : status === "speaking" ? (
            <Volume2 size={28} />
          ) : (
            <Mic size={28} />
          )}
        </span>
      </button>

      <div className="max-w-lg text-center">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-steel">{statusLabel}</p>
        <p className="mt-2 min-h-[3.5rem] text-base font-semibold leading-7 text-ink sm:text-lg">
          {caption || placeholderPrompt}
        </p>
        {error ? <p className="mt-2 text-sm font-bold text-ember">{error}</p> : null}
        {!recognition.supported ? (
          <p className="mt-2 text-xs font-bold text-steel">
            Voice input isn&apos;t supported in this browser — use the text box below instead.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setMuted((current) => !current)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink/10 bg-white/60 px-3 text-xs font-bold text-ink transition hover:bg-white dark:border-fog/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          {muted ? <MicOff size={14} /> : <Volume2 size={14} />}
          {muted ? "Voice reply off" : "Voice reply on"}
        </button>
        <button
          type="button"
          onClick={() => setShowTextFallback((current) => !current)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-ink/10 bg-white/60 px-3 text-xs font-bold text-ink transition hover:bg-white dark:border-fog/10 dark:bg-white/5 dark:hover:bg-white/10"
        >
          <Keyboard size={14} />
          {showTextFallback ? "Hide text input" : "Type instead"}
        </button>
      </div>

      {showTextFallback ? (
        <form onSubmit={submitText} className="w-full max-w-md">
          <div className="flex items-center gap-2 rounded-md border border-ink/10 bg-white/75 p-1.5 shadow-line dark:border-fog/10 dark:bg-white/5 dark:shadow-line-dark">
            <input
              value={textInput}
              onChange={(event) => setTextInput(event.target.value)}
              placeholder="Type your message…"
              className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm font-semibold outline-none"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || status === "thinking"}
              className="shrink-0 rounded-md bg-ink px-3 py-2 text-xs font-black text-fog transition disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
});

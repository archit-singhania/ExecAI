"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowUp, Loader2, Mic, Square, Trash2 } from "lucide-react";
import {
  halcyon,
  HalcyonEnvironment,
  HalcyonSession,
  HalcyonWorldId,
  pixelStreamUrl,
} from "@/lib/halcyon-api";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";
import { cn } from "@/lib/utils";

const WORLDS: { id: HalcyonWorldId; label: string }[] = [
  { id: "zen_garden", label: "Zen Garden" },
  { id: "ocean_dusk", label: "Ocean at Dusk" },
  { id: "old_forest", label: "Old Forest" },
  { id: "rain_cabin", label: "Rain Cabin" },
  { id: "nordic_lake", label: "Nordic Lake" },
  { id: "blossom_park", label: "Blossom Park" },
  { id: "desert_oasis", label: "Desert Oasis" },
  { id: "observatory", label: "Observatory" },
];

function moodClass(env: HalcyonEnvironment | null): string {
  if (!env) return "hal-mood-clear";
  if (env.breathing_guide && env.wind < 0.15) return "hal-mood-restless";
  if (env.warmth > 0.7 && env.time_of_day < 9) return "hal-mood-heavy";
  if (env.brightness < 0.45) return "hal-mood-flat";
  return "hal-mood-clear";
}

export default function HalcyonEnterPage() {
  const recognition = useSpeechRecognition();

  const [world, setWorld] = useState<HalcyonWorldId>("zen_garden");
  const [consent, setConsent] = useState(false);
  const [session, setSession] = useState<HalcyonSession | null>(null);
  const [environment, setEnvironment] = useState<HalcyonEnvironment | null>(null);
  const [reply, setReply] = useState("");
  const [text, setText] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (listening) recognition.stop();
    };
  }, [listening, recognition]);

  async function begin() {
    setBusy(true);
    setError("");
    try {
      const started = await halcyon.startSession(world, consent);
      setSession(started);
      setEnvironment(started.environment);
      setReply("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open the world.");
    } finally {
      setBusy(false);
    }
  }

  async function speak(value: string) {
    const trimmed = value.trim();
    if (!trimmed || !session || busy) return;

    setBusy(true);
    setError("");
    try {
      const turn = await halcyon.takeTurn(session.id, trimmed);
      setEnvironment(turn.environment);
      setReply(turn.reply);
      setText("");
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    if (listening) {
      recognition.stop();
      setListening(false);
      return;
    }
    setListening(true);
    recognition.start((final: string) => {
      setListening(false);
      void speak(final);
    });
  }

  async function leave() {
    if (!session) return;
    try {
      await halcyon.endSession(session.id);
    } catch {
    }
    setSession(null);
    setEnvironment(null);
    setReply("");
  }

  async function forgetEverything() {
    setBusy(true);
    try {
      await halcyon.deleteEverything();
      setSession(null);
      setEnvironment(null);
      setReply("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={cn("hal-root", moodClass(environment))}>
      <div className="hal-sky" aria-hidden="true" />
      <div className="hal-horizon" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1100px] flex-col px-5 py-6 sm:px-8">
        <nav className="flex items-center justify-between gap-3">
          <Link href="/halcyon" className="hal-back">
            <ArrowLeft size={15} />
            <span>Halcyon</span>
          </Link>
          {session ? (
            <button type="button" onClick={leave} className="hal-back">
              Leave the world
            </button>
          ) : null}
        </nav>

        {!session ? (
          <section className="flex flex-1 flex-col justify-center py-16">
            <p className="hal-eyebrow">Choose where to go</p>
            <h1 className="hal-title mt-4 max-w-2xl">Where do you want to be?</h1>

            <div className="mt-8 flex flex-wrap gap-2">
              {WORLDS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setWorld(option.id)}
                  aria-pressed={world === option.id}
                  className={cn("hal-mood-btn", world === option.id && "hal-mood-btn-active")}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setConsent((current) => !current)}
              className="mt-8 flex max-w-lg items-start gap-3 text-left"
            >
              <span className={cn("hal-consent-box", consent && "hal-consent-box-on")} />
              <span className="hal-world-note">
                Keep what I say. Off by default — without this, only the shape of the session is
                stored, never the words. You can delete everything at any time.
              </span>
            </button>

            <div className="mt-9">
              <button type="button" onClick={begin} disabled={busy} className="hal-enter-btn">
                {busy ? <Loader2 size={16} className="animate-spin" /> : null}
                Go in
              </button>
            </div>

            {error ? <p className="hal-error mt-5">{error}</p> : null}
          </section>
        ) : (
          <section className="flex flex-1 flex-col py-8">
            <div className="hal-stream">
              <iframe
                src={pixelStreamUrl()}
                title="Halcyon"
                allow="autoplay; fullscreen; microphone"
                className="h-full w-full border-0"
              />
              <div className="hal-stream-hint">
                <span className="hal-status-dot" />
                Streaming from your local Unreal instance
              </div>
            </div>

            <div className="mt-8 min-h-[5rem]">
              {reply ? (
                <p key={reply} className="hal-response">
                  {reply}
                </p>
              ) : (
                <p className="hal-world-note">Say anything. The world is listening.</p>
              )}
            </div>

            <form
              onSubmit={(event: FormEvent) => {
                event.preventDefault();
                void speak(text);
              }}
              className="mt-4"
            >
              <div className="hal-composer">
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={busy || !recognition.supported}
                  aria-label={listening ? "Stop listening" : "Speak"}
                  className={cn("hal-mic", listening && "hal-mic-live")}
                >
                  {listening ? <Square size={15} strokeWidth={2.6} /> : <Mic size={16} />}
                </button>

                <input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder={listening ? "Listening…" : "Or type it"}
                  disabled={busy}
                  className="hal-composer-input"
                />

                <button
                  type="submit"
                  disabled={!text.trim() || busy}
                  aria-label="Send"
                  className="hal-send"
                >
                  {busy ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={16} strokeWidth={2.6} />}
                </button>
              </div>
            </form>

            {environment ? (
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
                <Readout label="Light" value={`${Math.round(environment.brightness * 100)}%`} />
                <Readout label="Warmth" value={`${Math.round(environment.warmth * 100)}%`} />
                <Readout label="Wind" value={`${Math.round(environment.wind * 100)}%`} />
                <Readout label="Water" value={`${Math.round(environment.water_motion * 100)}%`} />
                <Readout label="Hour" value={`${Math.floor(environment.time_of_day)}:00`} />
                {environment.breathing_guide ? <Readout label="Breathing" value="on" /> : null}
              </div>
            ) : null}

            {error ? <p className="hal-error mt-5">{error}</p> : null}

            <div className="mt-auto flex justify-end pt-10">
              <button type="button" onClick={forgetEverything} className="hal-forget">
                <Trash2 size={13} />
                Delete everything
              </button>
            </div>

            <div ref={endRef} />
          </section>
        )}
      </div>
    </main>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="hal-readout-label">{label}</p>
      <p className="hal-readout-value">{value}</p>
    </div>
  );
}

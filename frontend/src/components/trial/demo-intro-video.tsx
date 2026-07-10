"use client";

import { useEffect, useRef, useState } from "react";
import { SkipForward, Volume2, VolumeX } from "lucide-react";

const INTRO_SECONDS = 12;

export function DemoIntroVideo({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.play().catch(() => setErrored(true));
  }, []);

  useEffect(() => {
    if (!errored) return;
    const timeout = window.setTimeout(onDone, 900);
    return () => window.clearTimeout(timeout);
  }, [errored, onDone]);

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;
    const pct = Math.min(100, (video.currentTime / INTRO_SECONDS) * 100);
    setProgress(pct);
    if (video.currentTime >= INTRO_SECONDS) {
      onDone();
    }
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      {!errored ? (
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          src="/Reverbvid.MOV"
          autoPlay
          muted
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onEnded={onDone}
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-fog/60">
          Loading demo…
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/50" />

      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 p-4 sm:p-6">
        <span className="pointer-events-none inline-flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 text-xs font-black text-fog/90 backdrop-blur">
          <span className="relative grid h-2 w-2 place-items-center rounded-full bg-accent">
            <span className="absolute inset-0 animate-ping rounded-full bg-accent/60" />
          </span>
          Live demo intro
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-fog/90 backdrop-blur transition hover:bg-black/60"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <button
            type="button"
            onClick={onDone}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-black/40 px-4 text-xs font-bold text-fog/90 backdrop-blur transition hover:bg-black/60"
          >
            Skip <SkipForward size={13} />
          </button>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 h-1 bg-fog/15">
        <div
          className="h-full bg-gradient-to-r from-ember via-accent to-basil transition-[width] duration-150 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

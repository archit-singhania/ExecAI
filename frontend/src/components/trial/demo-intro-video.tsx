"use client";

import { useEffect, useRef, useState } from "react";

const INTRO_SECONDS = 12;

export function DemoIntroVideo({ onDone }: { onDone: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [progress, setProgress] = useState(0);
  const [errored, setErrored] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video.play().catch(() => {
      video.muted = true;
      video.play().catch(() => setErrored(true));
    });
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      {!errored ? (
        <div className="absolute inset-0 h-full w-full">
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-cover"
            src="/Reverbvid.MOV"
            autoPlay
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onEnded={onDone}
            onError={() => setErrored(true)}
            onLoadedData={() => setReady(true)}
          />
          {!ready ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-fog/20 border-t-fog/70" />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-fog/60">
          Loading demo…
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 z-20 h-1 bg-fog/15">
        <div
          className="h-full bg-gradient-to-r from-ember via-accent to-basil transition-[width] duration-150 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

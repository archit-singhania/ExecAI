"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ListChecks,
  MessagesSquare,
  Play,
  Presentation,
  Users2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ceoai-onboarded";

type Step = {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  icon: React.ElementType;
  clip: string | null;
  poster: string | null;
};

const STEPS: Step[] = [
  {
    id: "ask",
    eyebrow: "Step one",
    title: "Give the board something to argue about",
    body: "Open the chat tile and describe what you're building, or the decision you're stuck on. Speak it or type it — the board takes either.",
    icon: MessagesSquare,
    clip: "/onboarding/01-ask.mp4",
    poster: "/onboarding/01-ask.jpg",
  },
  {
    id: "convene",
    eyebrow: "Step two",
    title: "Watch nine specialists file",
    body: "A CFO, a CTO, a CMO and six more examine it separately. Each desk lights up as its report lands, with its own conviction score.",
    icon: Users2,
    clip: "/onboarding/02-convene.mp4",
    poster: "/onboarding/02-convene.jpg",
  },
  {
    id: "disagree",
    eyebrow: "Step three",
    title: "Read where they disagree",
    body: "Operations shows the conviction spread. A tight band means the floor is aligned. A wide one means the risk is real, and it names who is most sceptical.",
    icon: Presentation,
    clip: "/onboarding/03-spread.mp4",
    poster: "/onboarding/03-spread.jpg",
  },
  {
    id: "execute",
    eyebrow: "Step four",
    title: "Work the tasks, then let the board score you",
    body: "Every session produces tasks. Turn on a weekly cadence and the board reviews your progress whether or not you open the app.",
    icon: ListChecks,
    clip: "/onboarding/04-review.mp4",
    poster: "/onboarding/04-review.jpg",
  },
];

export function hasOnboarded(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

export function resetOnboarding() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") finish();
      if (event.key === "ArrowRight") advance();
      if (event.key === "ArrowLeft") setIndex((current) => Math.max(0, current - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    videoRef.current?.load();
  }, [index]);

  function finish() {
    window.localStorage.setItem(STORAGE_KEY, "1");
    onDone();
  }

  function advance() {
    if (isLast) finish();
    else setIndex((current) => current + 1);
  }

  return (
    <div className="onb-root" role="dialog" aria-modal="true" aria-label="Getting started">
      <div className="onb-scrim" />

      <div className="onb-panel">
        <button type="button" onClick={finish} className="onb-close" aria-label="Skip">
          <X size={16} />
        </button>

        <div className="onb-stage">
          <div className="onb-phone">
            <div className="onb-phone-notch" aria-hidden="true" />
            <video
              ref={videoRef}
              className="onb-video"
              poster={step.poster ?? undefined}
              autoPlay
              muted
              loop
              playsInline
            >
              {step.clip ? <source src={step.clip} type="video/mp4" /> : null}
            </video>

            <div className="onb-video-fallback">
              <Play size={22} />
              <p className="onb-fallback-title">Clip {index + 1} goes here</p>
              <p className="onb-fallback-hint">
                Drop a 9:16 screen recording at
                <br />
                <code>{step.clip}</code>
              </p>
            </div>
          </div>
        </div>

        <div className="onb-body">
          <div className="onb-step-icon">
            <step.icon size={17} strokeWidth={1.9} />
          </div>

          <p className="sec-eyebrow mt-3">{step.eyebrow}</p>
          <h2 className="onb-title">{step.title}</h2>
          <p className="onb-text">{step.body}</p>

          <div className="onb-dots">
            {STEPS.map((entry, position) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setIndex(position)}
                aria-label={`Go to step ${position + 1}`}
                className={cn("onb-dot", position === index && "onb-dot-on")}
              />
            ))}
          </div>

          <div className="onb-actions">
            <button type="button" onClick={finish} className="onb-skip">
              Skip
            </button>
            <button type="button" onClick={advance} className="onb-next">
              {isLast ? (
                <>
                  <Check size={15} />
                  Start
                </>
              ) : (
                <>
                  Next
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

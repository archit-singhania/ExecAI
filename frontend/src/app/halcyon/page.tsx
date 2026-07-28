"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Compass, Ear, Waves } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { formatHour, WORLD_BASELINES, worldGradient } from "@/lib/halcyon-worlds";
import { cn } from "@/lib/utils";

type Mood = "restless" | "heavy" | "flat" | "clear";

const MOODS: { value: Mood; label: string; response: string }[] = [
  { value: "restless", label: "Restless", response: "The wind drops. The water goes still. Nothing is asked of you." },
  { value: "heavy", label: "Heavy", response: "Dawn comes early here. The light warms, and something small comes to sit nearby." },
  { value: "flat", label: "Flat", response: "Colour returns slowly. A path opens toward the treeline, if you want it." },
  { value: "clear", label: "Clear", response: "The sky stays open. The world holds its shape and lets you think." },
];

export default function HalcyonPage() {
  const [mood, setMood] = useState<Mood>("clear");
  const active = MOODS.find((option) => option.value === mood) ?? MOODS[3];

  return (
    <main className={cn("hal-root", `hal-mood-${mood}`)}>
      <div className="hal-sky" aria-hidden="true" />
      <div className="hal-horizon" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[1100px] flex-col px-5 py-6 sm:px-8">
        <nav className="flex items-center justify-between gap-3">
          <Link href="/" className="hal-back">
            <ArrowLeft size={15} />
            <span>Back</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <Logo size={26} />
            <span className="hal-wordmark">Halcyon</span>
          </div>
        </nav>

        <section className="flex flex-1 flex-col justify-center py-16 sm:py-24">
          <p className="hal-eyebrow">CEO.ai · Halcyon</p>
          <h1 className="hal-title mt-5 max-w-3xl">A place to go when the boardroom is too loud.</h1>
          <p className="hal-lede mt-6 max-w-xl">
            Halcyon is a world you walk into and speak in. It listens, answers, and changes around you
            — the light, the weather, the water, what comes close. Rendered in Unreal Engine 5 and
            streamed straight to the browser. No headset, no download.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link href="/signup?from=halcyon">
              <Button className="h-12 px-6">
                Request early access <ArrowRight size={16} />
              </Button>
            </Link>
            <Link href="/halcyon/enter" className="hal-back">
              Enter the prototype
            </Link>
            <span className="hal-status">
              <span className="hal-status-dot" />
              In development
            </span>
          </div>
        </section>

        <section className="hal-panel">
          <p className="hal-eyebrow">Try the idea</p>
          <p className="hal-panel-lede mt-2.5">Say how you are. The world answers in weather, not advice.</p>

          <div className="mt-5 flex flex-wrap gap-2">
            {MOODS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMood(option.value)}
                aria-pressed={mood === option.value}
                className={cn("hal-mood-btn", mood === option.value && "hal-mood-btn-active")}
              >
                {option.label}
              </button>
            ))}
          </div>

          <p key={active.value} className="hal-response mt-6">
            {active.response}
          </p>
        </section>

        <section className="mt-20 grid gap-8 sm:grid-cols-3">
          <Pillar
            icon={Ear}
            title="It listens first"
            body="You speak the way you'd speak to anyone. No prompts, no commands, nothing to learn."
          />
          <Pillar
            icon={Waves}
            title="The world responds"
            body="Rain eases. The sun moves. Water settles. The environment is the reply, not the backdrop."
          />
          <Pillar
            icon={Compass}
            title="It remembers"
            body="Where you went, what helped, what you returned to. It knows the place you like at dusk."
          />
        </section>

        <section className="mt-20">
          <div className="flex items-baseline justify-between gap-3">
            <p className="hal-eyebrow">The worlds</p>
            <span className="hal-count">{WORLD_BASELINES.length} planned</span>
          </div>

          <div className="hal-world-cards mt-5">
            {WORLD_BASELINES.map((world) => (
              <div key={world.id} className="hal-card">
                <span className="hal-card-sky" style={{ background: worldGradient(world) }}>
                  <span className="hal-card-hour">{formatHour(world.timeOfDay)}</span>
                  {world.first ? <span className="hal-card-flag">First build</span> : null}
                </span>
                <span className="hal-card-body">
                  <span className="hal-card-name">{world.label}</span>
                  <span className="hal-card-note">{world.note}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 max-w-2xl">
          <p className="hal-eyebrow">What it isn&apos;t</p>
          <p className="hal-lede mt-4 text-[0.95rem]">
            Halcyon is a quiet place to think out loud. It isn&apos;t clinical care and it isn&apos;t a
            substitute for a professional — if you&apos;re struggling, please talk to someone qualified.
            Sessions are yours: nothing is kept without your say-so, and you can delete all of it.
          </p>
        </section>

        <footer className="hal-footer mt-20 flex flex-wrap items-center justify-between gap-4 py-8">
          <p className="hal-footnote">Halcyon · an unreleased part of CEO.ai</p>
          <div className="flex items-center gap-5">
            <a
              href="https://findahelpline.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hal-quiet-support"
            >
              Talk to someone
            </a>
            <Link href="/" className="hal-back">
              <ArrowLeft size={15} />
              <span>Back to CEO.ai</span>
            </Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

function Pillar({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
}) {
  return (
    <div>
      <Icon size={19} className="hal-pillar-icon" strokeWidth={1.6} />
      <h3 className="hal-pillar-title mt-3.5">{title}</h3>
      <p className="hal-pillar-body mt-2">{body}</p>
    </div>
  );
}

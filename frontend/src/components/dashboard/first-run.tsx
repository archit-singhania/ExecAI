"use client";

import { useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const EXAMPLES = [
  {
    label: "A B2B SaaS idea",
    goal: "I want to build an invoicing tool for freelance designers. Should I build it or validate first?",
  },
  {
    label: "A pricing decision",
    goal: "I charge €9 a month and barely break even. Should I raise prices or cut costs?",
  },
  {
    label: "A launch question",
    goal: "I have a working prototype and no users. What should I do in the next seven days?",
  },
  {
    label: "A hard call",
    goal: "My co-founder wants to raise money. I want to stay bootstrapped. Argue both sides.",
  },
];

export function FirstRun({
  onStart,
  busy = false,
  name,
}: {
  onStart: (goal: string) => void;
  busy?: boolean;
  name?: string | null;
}) {
  const [goal, setGoal] = useState("");
  const [active, setActive] = useState<number | null>(null);

  function choose(index: number) {
    setActive(index);
    setGoal(EXAMPLES[index].goal);
  }

  function submit() {
    const value = goal.trim();
    if (!value || busy) return;
    onStart(value);
  }

  const first = name?.trim().split(" ")[0];

  return (
    <div className="fr">
      <div className="fr-badge">
        <Sparkles size={13} />
        Nine specialists, standing by
      </div>

      <h1 className="fr-title">
        {first ? `${first}, what should the board look at?` : "What should the board look at?"}
      </h1>

      <p className="fr-lede">
        Describe what you&apos;re building or the decision you&apos;re stuck on. Nine specialists
        will examine it separately — and they won&apos;t all agree, which is the point.
      </p>

      <div className="fr-composer">
        <textarea
          value={goal}
          onChange={(event) => {
            setGoal(event.target.value);
            setActive(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit();
          }}
          rows={3}
          placeholder="I'm building…"
          className="fr-input"
        />

        <div className="fr-actions">
          <span className="fr-hint">
            {goal.trim().length < 15 ? "A sentence or two is plenty" : "⌘ + Enter to convene"}
          </span>
          <button
            type="button"
            onClick={submit}
            disabled={goal.trim().length < 15 || busy}
            className="fr-go"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : null}
            Convene the board
            {!busy ? <ArrowRight size={15} /> : null}
          </button>
        </div>
      </div>

      <p className="fr-or">Or start from one of these</p>

      <div className="fr-examples">
        {EXAMPLES.map((example, index) => (
          <button
            key={example.label}
            type="button"
            onClick={() => choose(index)}
            className={cn("fr-example", active === index && "fr-example-on")}
          >
            <span className="fr-example-label">{example.label}</span>
            <span className="fr-example-goal">{example.goal}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

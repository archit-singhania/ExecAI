"use client";

import Link from "next/link";
import { ArrowRight, Gavel, Target, Users2 } from "lucide-react";

const PILLARS = [
  {
    icon: Users2,
    eyebrow: "Nine desks, not one voice",
    title: "They examine it separately",
    body: "A CFO, a CTO, a CMO and six more file independently. You watch each desk report in real time, with its own conviction score.",
  },
  {
    icon: Gavel,
    eyebrow: "Disagreement is the signal",
    title: "You see the spread, not an average",
    body: "When your CFO says 78 and your CTO says 44, that gap is where the risk lives. Most tools smooth it away. This one names who is sceptical and why.",
  },
  {
    icon: Target,
    eyebrow: "Accountability, not advice",
    title: "Every call is dated and scored",
    body: "Each specialist commits to something falsifiable. You mark it right or wrong later. Over months you learn exactly which desk to trust.",
  },
];

const SAMPLE = [
  { agent: "CTO", score: 91 },
  { agent: "Product", score: 81 },
  { agent: "CFO", score: 74 },
  { agent: "Sales", score: 66 },
  { agent: "Marketing", score: 44 },
];

function scoreColor(score: number) {
  if (score >= 85) return "#1d6f5f";
  if (score >= 70) return "#5b7ad6";
  if (score >= 50) return "#b7ca5d";
  return "#d45f3a";
}

export function LandingPillars() {
  const low = Math.min(...SAMPLE.map((entry) => entry.score));
  const high = Math.max(...SAMPLE.map((entry) => entry.score));
  const position = (score: number) => 4 + (score / 100) * 92;

  return (
    <section className="lp">
      <div className="lp-inner">
        <p className="sec-eyebrow">Why this is different</p>
        <h2 className="lp-heading">
          Every other AI gives you advice. This one gives you a board that argues.
        </h2>

        <div className="lp-grid">
          {PILLARS.map((pillar) => (
            <article key={pillar.title} className="lp-card">
              <span className="lp-icon">
                <pillar.icon size={17} strokeWidth={1.9} />
              </span>
              <p className="lp-card-eyebrow">{pillar.eyebrow}</p>
              <h3 className="lp-card-title">{pillar.title}</h3>
              <p className="lp-card-body">{pillar.body}</p>
            </article>
          ))}
        </div>

        <div className="lp-demo">
          <div className="lp-demo-head">
            <p className="sec-eyebrow">A real conviction spread</p>
            <span className="lp-demo-range">{high - low} point range</span>
          </div>

          <div className="cs-axis">
            <div
              className="cs-band"
              style={{ left: `${position(low)}%`, width: `${position(high) - position(low)}%` }}
            />
            {SAMPLE.map((entry) => (
              <div
                key={entry.agent}
                className="cs-point"
                style={{ left: `${position(entry.score)}%`, background: scoreColor(entry.score) }}
                title={`${entry.agent}: ${entry.score}`}
              />
            ))}
          </div>

          <p className="lp-demo-caption">
            Your CTO is convinced. Your marketing lead is not. That 47-point gap is the most
            useful thing on this page — and no single-model tool can show it to you.
          </p>
        </div>

        <div className="lp-cta">
          <Link href="/signup">
            <span className="lp-cta-primary">
              Convene your board
              <ArrowRight size={16} />
            </span>
          </Link>
          <Link href="/login" className="lp-cta-quiet">
            Or try the live demo — no account needed
          </Link>
        </div>
      </div>
    </section>
  );
}

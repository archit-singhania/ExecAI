"use client";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Compass,
  FileText,
  Layers3,
  Moon,
  ShieldCheck,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import { MarketingNav } from "@/components/marketing/marketing-nav";
import { Logo } from "@/components/logo";
import { startDemoSession } from "@/lib/auth";

export default function LandingPage() {
  return (
    <main id="main" className="material-marketing">
      <MarketingNav />
      <section className="material-hero">
        <div>
          <span className="material-label">Your executive decision studio</span>
          <h1>
            Lead with clarity.
            <br />
            Build with <em>conviction.</em>
          </h1>
          <p>
            A board of specialist perspectives, a living evidence library, and a
            thoughtful workspace for turning ambitious plans into accountable action.
          </p>
          <div className="material-links">
            <Link href="/signup" className="material-cta">
              Create your workspace <ArrowRight size={17} />
            </Link>
            <Link
              href="/dashboard"
              onClick={startDemoSession}
              className="material-link"
            >
              Explore the demo <Sparkles size={16} />
            </Link>
          </div>
          <small className="material-footnote">
            Nine perspectives. Your judgment at the center.
          </small>
        </div>
        <div className="material-preview" aria-label="Illustrative boardroom preview">
          <div className="material-preview-top">
            <Logo size={29} />
            <span>Executive boardroom</span>
            <small>Illustrative preview</small>
          </div>
          <div className="material-preview-question">
            What is the strongest next move
            <br />
            for our company?
          </div>
          {[
            {
              name: "Market Research",
              note: "Challenge demand assumptions",
              icon: Compass,
            },
            { name: "CFO", note: "Test runway and unit economics", icon: Wallet },
            {
              name: "Product & Technology",
              note: "Find the smallest useful experiment",
              icon: Layers3,
            },
            {
              name: "Legal & Operations",
              note: "Make risk and responsibilities visible",
              icon: ShieldCheck,
            },
          ].map(({ name, note, icon: Icon }) => (
            <div className="material-agent-row" key={name}>
              <span>
                <Icon size={15} />
              </span>
              <div>
                <strong>{name}</strong>
                <small>{note}</small>
              </div>
              <Check size={13} />
            </div>
          ))}
          <div className="material-preview-note">
            <strong>A decision worth examining.</strong>See the reasoning. Inspect the
            evidence. Track what happens next.
          </div>
        </div>
      </section>
      <section className="material-section">
        <span className="material-label">A considered operating system</span>
        <h2>Everything behind a confident decision.</h2>
        <div className="material-features">
          {[
            {
              title: "A board with perspective",
              detail:
                "Watch specialists report, compare their conviction, and challenge a recommendation before accepting it.",
              icon: Compass,
            },
            {
              title: "Evidence you can inspect",
              detail:
                "Bring company documents and verified research into the workspace. Retrieve passages and preserve the sources behind your choices.",
              icon: FileText,
            },
            {
              title: "Execution that closes the loop",
              detail:
                "Save decisions, model financial scenarios, assign tasks, review forecasts and return to your goals with an accountable record.",
              icon: Target,
            },
          ].map(({ title, detail, icon: Icon }) => (
            <article className="material-feature" key={title}>
              <Icon size={25} />
              <h3>{title}</h3>
              <p>{detail}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="material-band">
        <span className="material-label">From ambition to action</span>
        <h2>Your next chapter deserves a clear plan.</h2>
        <p>
          Start with the company context. Ask a meaningful question. Build your decision
          trail.
        </p>
        <Link href="/signup" className="material-cta">
          Meet your executive studio <ArrowRight size={17} />
        </Link>
      </section>
      <footer className="material-footer">
        <span>CEO.ai · Evidence informs. People decide.</span>
        <Link href="/pricing">Plans</Link>
        <Link href="/about-author">About the maker</Link>
        <Link href="/halcyon">
          <Moon size={12} /> Halcyon
        </Link>
        <Link href="/login">
          Sign in <ArrowRight size={12} />
        </Link>
      </footer>
    </main>
  );
}

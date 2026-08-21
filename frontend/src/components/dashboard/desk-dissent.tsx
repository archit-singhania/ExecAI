"use client";

import { useMemo, useState } from "react";
import { Scale, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { AgentReport } from "@/lib/api";
import { agentMeta } from "@/lib/dashboard-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
   Desk dissent.

   The conviction spread already tells the user THAT the board disagrees. This
   tells them WHERE and WHY: the two outlier desks side by side with their
   actual filed reasoning, and a handoff to the CEO desk to reconcile them.

   Design note: the split is deliberately symmetrical. Presenting the sceptic
   first or larger would editorialise, and the premise of the product is that
   the user adjudicates.
--------------------------------------------------------------------------- */

type Tone = "positive" | "accent" | "caution" | "critical";

function readSpread(spread: number) {
  if (spread <= 10) {
    return {
      label: "Aligned",
      tone: "positive" as Tone,
      headline: "The floor is aligned.",
      body: "No desk is more than a few points from the mean. Disagreement here is noise rather than signal — treat the verdict as the board's settled view.",
    };
  }
  if (spread <= 22) {
    return {
      label: "Reservations",
      tone: "accent" as Tone,
      headline: "Broad agreement, with reservations.",
      body: "The board leans one way, but at least one desk is holding back. Worth reading the sceptic before you commit.",
    };
  }
  if (spread <= 35) {
    return {
      label: "Split",
      tone: "caution" as Tone,
      headline: "The floor is genuinely split.",
      body: "This is the range where the average misleads. The two positions below are close to irreconcilable — one of them is wrong, and it matters which.",
    };
  }
  return {
    label: "Contested",
    tone: "critical" as Tone,
    headline: "Your board is in open disagreement.",
    body: "A spread this wide usually means the desks are working from different assumptions rather than different risk appetites. Resolve the assumption before acting on the verdict.",
  };
}

export function DeskDissent({
  reports,
  onAskDesk,
  onAdjudicate,
}: {
  reports: AgentReport[];
  /** Open a focused thread with one desk. */
  onAskDesk?: (agent: string) => void;
  /** Ask the CEO desk to reconcile the two positions. */
  onAdjudicate?: (low: AgentReport, high: AgentReport) => void;
}) {
  const [adjudicating, setAdjudicating] = useState(false);

  const stats = useMemo(() => {
    if (reports.length < 2) return null;

    const sorted = [...reports].sort((a, b) => a.score - b.score);
    const scores = sorted.map((report) => report.score);
    const mean = Math.round(
      scores.reduce((sum, value) => sum + value, 0) / scores.length,
    );

    const low = sorted[0];
    const high = sorted[sorted.length - 1];

    // Desks within 6 points of the mean aren't taking a position — they're
    // deferring. Naming them is useful context for the adjudication.
    const deferring = sorted.filter(
      (report) =>
        report.agent !== low.agent &&
        report.agent !== high.agent &&
        Math.abs(report.score - mean) <= 6,
    );

    return { sorted, mean, low, high, spread: high.score - low.score, deferring };
  }, [reports]);

  if (!stats) {
    return (
      <EmptyState
        icon={Scale}
        title="Not enough filed to find disagreement"
        body="Dissent appears once at least two desks have reported. Convene the board to get started."
      />
    );
  }

  const reading = readSpread(stats.spread);

  function adjudicate() {
    if (!stats || !onAdjudicate) return;
    setAdjudicating(true);
    onAdjudicate(stats.low, stats.high);
  }

  return (
    <div className="space-y-4">
      {/* ---- Reading -------------------------------------------------- */}
      <Card pad="md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="sec-eyebrow">Dissent</p>
              <Badge tone={reading.tone} dot>
                {reading.label}
              </Badge>
            </div>
            <p className="mt-2 text-lg font-semibold tracking-tightest">
              {reading.headline}
            </p>
            <p className="ui-card-desc max-w-[62ch]">{reading.body}</p>
          </div>

          <div className="shrink-0 text-right">
            <p className="font-display text-3xl leading-none tracking-tightest tabular">
              <AnimatedNumber value={stats.spread} />
            </p>
            <p className="mt-1 text-xs font-bold text-steel">point range</p>
          </div>
        </div>

        {/* Distribution. Every desk is a tick; outliers are darker. */}
        <div className="mt-6">
          <div className="relative h-9">
            <div className="absolute inset-x-0 top-4 h-px bg-ink/10" />

            <div
              className="absolute top-3 h-3 rounded-full bg-accent/15"
              style={{ left: `${stats.low.score}%`, width: `${stats.spread}%` }}
            />

            <div
              className="absolute top-1.5 h-6 w-px bg-ink/30"
              style={{ left: `${stats.mean}%` }}
            />

            {stats.sorted.map((report) => {
              const outlier =
                report.agent === stats.low.agent ||
                report.agent === stats.high.agent;

              return (
                <button
                  key={report.agent}
                  type="button"
                  onClick={() => onAskDesk?.(report.agent)}
                  aria-label={`${report.agent}, conviction ${report.score}`}
                  title={`${report.agent}: ${report.score}`}
                  className={cn(
                    "absolute top-2.5 -ml-1.5 h-4 w-3 rounded-full transition-transform duration-fast ease-out hover:scale-125",
                    outlier ? "bg-ink" : "bg-steel/60",
                  )}
                  style={{ left: `${report.score}%` }}
                />
              );
            })}
          </div>

          <div className="flex justify-between text-xs font-bold text-steel tabular">
            <span>0</span>
            <span>mean {stats.mean}</span>
            <span>100</span>
          </div>
        </div>
      </Card>

      {/* ---- The two positions ---------------------------------------- */}
      <div className="grid gap-3 lg:grid-cols-2">
        <Position
          role="sceptic"
          report={stats.low}
          mean={stats.mean}
          onAskDesk={onAskDesk}
        />
        <Position
          role="advocate"
          report={stats.high}
          mean={stats.mean}
          onAskDesk={onAskDesk}
        />
      </div>

      {/* ---- Adjudication --------------------------------------------- */}
      {onAdjudicate ? (
        <Card pad="md" elev={1}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                Have the CEO desk reconcile these two.
              </p>
              <p className="ui-card-desc">
                {stats.deferring.length
                  ? `${stats.deferring.length} other desk${stats.deferring.length === 1 ? "" : "s"} sat near the mean and effectively deferred.`
                  : "Every desk took a position — no one deferred to the mean."}
              </p>
            </div>

            <Button onClick={adjudicate} disabled={adjudicating}>
              <Sparkles size={15} strokeWidth={1.75} />
              {adjudicating ? "Adjudicating…" : "Adjudicate"}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Position({
  role,
  report,
  mean,
  onAskDesk,
}: {
  role: "sceptic" | "advocate";
  report: AgentReport;
  mean: number;
  onAskDesk?: (agent: string) => void;
}) {
  const sceptic = role === "sceptic";
  const delta = report.score - mean;
  const meta = agentMeta[report.agent as keyof typeof agentMeta];
  const Icon = meta?.icon;

  return (
    <Card pad="md" className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon ? (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-ink/5 text-steel">
              <Icon size={16} strokeWidth={1.75} />
            </span>
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{report.agent}</p>
            <p className="text-xs font-semibold text-steel">
              {sceptic ? "Most sceptical" : "Most convinced"}
            </p>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p
            className={cn(
              "text-xl font-bold leading-none tabular",
              sceptic ? "text-critical" : "text-positive",
            )}
          >
            {report.score}
          </p>
          <p className="mt-1 flex items-center justify-end gap-0.5 text-xs font-bold text-steel tabular">
            {sceptic ? (
              <TrendingDown size={11} strokeWidth={2.5} />
            ) : (
              <TrendingUp size={11} strokeWidth={2.5} />
            )}
            {delta > 0 ? "+" : ""}
            {delta}
          </p>
        </div>
      </div>

      {report.title ? (
        <p className="mt-3.5 text-sm font-semibold leading-snug">{report.title}</p>
      ) : null}

      {report.summary ? (
        <p className="mt-1.5 text-sm leading-relaxed text-steel">
          {report.summary}
        </p>
      ) : null}

      {report.bullets?.length ? (
        <ul className="mt-3 space-y-1.5">
          {report.bullets.map((bullet, index) => (
            <li key={index} className="flex gap-2 text-sm leading-relaxed">
              <span
                className={cn(
                  "mt-1.5 h-1 w-1 shrink-0 rounded-full",
                  sceptic ? "bg-critical" : "bg-positive",
                )}
                aria-hidden="true"
              />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {!report.title && !report.summary && !report.bullets?.length ? (
        <p className="mt-3.5 text-sm text-steel">No reasoning recorded.</p>
      ) : null}

      <div className="mt-auto pt-4">
        <Button
          variant="quiet"
          size="sm"
          onClick={() => onAskDesk?.(report.agent)}
        >
          Ask {report.agent} directly
        </Button>
      </div>
    </Card>
  );
}

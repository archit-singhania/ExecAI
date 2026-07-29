"use client";

import { useMemo } from "react";
import { AgentReport } from "@/lib/api";
import { cn } from "@/lib/utils";

function scoreColor(score: number) {
  if (score >= 85) return "#1d6f5f";
  if (score >= 70) return "#5b7ad6";
  if (score >= 50) return "#b7ca5d";
  return "#d45f3a";
}

export function ConvictionSpread({ reports }: { reports: AgentReport[] }) {
  const stats = useMemo(() => {
    if (!reports.length) return null;

    const sorted = [...reports].sort((a, b) => a.score - b.score);
    const scores = sorted.map((report) => report.score);
    const low = scores[0];
    const high = scores[scores.length - 1];
    const mean = Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);

    return {
      sorted,
      low,
      high,
      mean,
      spread: high - low,
      lowest: sorted[0],
      highest: sorted[sorted.length - 1],
    };
  }, [reports]);

  if (!stats) {
    return (
      <p className="py-6 text-center text-[0.8rem] font-medium leading-6 text-steel">
        Conviction appears once your specialists have filed.
      </p>
    );
  }

  const pos = (score: number) => 4 + (score / 100) * 92;

  const verdict =
    stats.spread <= 10
      ? "The floor is aligned."
      : stats.spread <= 22
        ? "Broad agreement, with reservations."
        : "The floor is genuinely split.";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="sec-eyebrow">Conviction spread</p>
          <p className="mt-1 text-[0.85rem] font-bold tracking-[-0.01em]">{verdict}</p>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-black tabular-nums leading-none tracking-[-0.02em]">
            {stats.spread}
          </span>
          <span className="text-[0.7rem] font-bold text-steel">point range</span>
        </div>
      </div>

      <div className="cs-axis">
        <div
          className="cs-band"
          style={{ left: `${pos(stats.low)}%`, width: `${pos(stats.high) - pos(stats.low)}%` }}
        />
        <div className="cs-mean" style={{ left: `${pos(stats.mean)}%` }} />

        {stats.sorted.map((report) => (
          <div
            key={`${report.agent}-${report.score}`}
            className="cs-point"
            style={{ left: `${pos(report.score)}%`, background: scoreColor(report.score) }}
            title={`${report.agent}: ${report.score}`}
          />
        ))}
      </div>

      <div className="cs-scale">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Outlier
          label="Most sceptical"
          agent={stats.lowest.agent}
          score={stats.lowest.score}
          delta={stats.lowest.score - stats.mean}
        />
        <Outlier
          label="Most convinced"
          agent={stats.highest.agent}
          score={stats.highest.score}
          delta={stats.highest.score - stats.mean}
        />
      </div>
    </div>
  );
}

function Outlier({
  label,
  agent,
  score,
  delta,
}: {
  label: string;
  agent: string;
  score: number;
  delta: number;
}) {
  return (
    <div className="sec-card rounded-lg p-3.5">
      <p className="sec-eyebrow">{label}</p>
      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        <p className="truncate text-[0.85rem] font-bold">{agent}</p>
        <div className="flex shrink-0 items-baseline gap-1.5">
          <span className="text-[0.95rem] font-black tabular-nums" style={{ color: scoreColor(score) }}>
            {score}
          </span>
          <span
            className={cn(
              "text-[0.68rem] font-bold tabular-nums",
              delta < 0 ? "text-ember" : "text-basil",
            )}
          >
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        </div>
      </div>
    </div>
  );
}

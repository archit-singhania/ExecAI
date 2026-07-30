"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Minus, Target, X } from "lucide-react";
import {
  Calibration,
  Prediction,
  predictionsApi,
} from "@/lib/predictions";
import {
  EmptyState,
  MetricRow,
  MetricStat,
  SectionHeader,
  SectionPanel,
  SkeletonCards,
} from "@/components/dashboard/section-kit";
import { toastFromError, toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const DEMO_PREDICTIONS: Prediction[] = [
  {
    id: "demo-1",
    agent: "CFO",
    statement: "Cost to acquire a customer will exceed first-month revenue per customer.",
    confidence: 71,
    due_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: "pending",
    resolved_at: null,
    note: null,
    overdue: true,
    days_remaining: -2,
  },
  {
    id: "demo-2",
    agent: "Sales",
    statement: "At least one prospect will commit to a paid pilot.",
    confidence: 84,
    due_at: new Date(Date.now() + 86400000 * 11).toISOString(),
    status: "pending",
    resolved_at: null,
    note: null,
    overdue: false,
    days_remaining: 11,
  },
  {
    id: "demo-3",
    agent: "Marketing",
    statement: "Organic channels will produce more signups than paid in the first month.",
    confidence: 58,
    due_at: new Date(Date.now() + 86400000 * 19).toISOString(),
    status: "pending",
    resolved_at: null,
    note: null,
    overdue: false,
    days_remaining: 19,
  },
];

const DEMO_CALIBRATION: Calibration = {
  overall: 64,
  resolved_total: 22,
  agents: [
    { agent: "CTO", hit: 5, missed: 1, pending: 1, resolved: 6, accuracy: 83 },
    { agent: "CFO", hit: 4, missed: 2, pending: 1, resolved: 6, accuracy: 67 },
    { agent: "Product Manager", hit: 3, missed: 2, pending: 0, resolved: 5, accuracy: 60 },
    { agent: "Marketing", hit: 2, missed: 3, pending: 1, resolved: 5, accuracy: 40 },
  ],
};

function accuracyColor(accuracy: number | null) {
  if (accuracy === null) return "rgb(var(--color-steel))";
  if (accuracy >= 70) return "#1d6f5f";
  if (accuracy >= 50) return "#5b7ad6";
  if (accuracy >= 35) return "#b7ca5d";
  return "#d45f3a";
}

export function TrackRecord({ isDemo }: { isDemo?: boolean }) {
  const [pending, setPending] = useState<Prediction[]>([]);
  const [calibration, setCalibration] = useState<Calibration | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (isDemo) {
      setPending(DEMO_PREDICTIONS);
      setCalibration(DEMO_CALIBRATION);
      setLoading(false);
      return;
    }

    try {
      const [list, stats] = await Promise.all([
        predictionsApi.list("pending"),
        predictionsApi.calibration(),
      ]);
      setPending(list.predictions);
      setCalibration(stats);
    } catch {
      setCalibration(null);
    } finally {
      setLoading(false);
    }
  }, [isDemo]);

  useEffect(() => {
    load();
  }, [load]);

  async function resolve(id: string, status: "hit" | "missed" | "void") {
    const previous = pending;
    setPending((current) => current.filter((item) => item.id !== id));

    if (isDemo) {
      toast.info("Sign up to keep score", "Trial results aren't saved.");
      return;
    }

    try {
      await predictionsApi.resolve(id, status);
      const stats = await predictionsApi.calibration();
      setCalibration(stats);
      toast.success(
        status === "hit" ? "Marked correct" : status === "missed" ? "Marked wrong" : "Voided",
      );
    } catch (error) {
      setPending(previous);
      toastFromError(error, "Couldn't record that");
    }
  }

  const overdue = pending.filter((item) => item.overdue);
  const best = calibration?.agents.find((agent) => agent.accuracy !== null);
  const worst = [...(calibration?.agents ?? [])]
    .filter((agent) => agent.accuracy !== null)
    .pop();

  return (
    <SectionPanel tone="plum">
      <SectionHeader
        eyebrow="Accountability"
        title="Track record"
        icon={Target}
        meta={
          calibration?.overall !== null && calibration?.overall !== undefined ? (
            <span className="sec-eyebrow tabular-nums">{calibration.overall}% overall</span>
          ) : null
        }
      />

      <MetricRow>
        <MetricStat
          label="Board accuracy"
          value={calibration?.overall ?? "—"}
          hint={`${calibration?.resolved_total ?? 0} resolved`}
          emphasis
        />
        <MetricStat label="Open calls" value={pending.length} hint="awaiting outcome" />
        <MetricStat label="Ready to judge" value={overdue.length} hint="past their date" />
        <MetricStat
          label="Most reliable"
          value={best?.accuracy ?? "—"}
          hint={best?.agent ?? "not enough data"}
        />
      </MetricRow>

      {loading ? (
        <SkeletonCards count={2} />
      ) : (
        <>
          {calibration?.agents.length ? (
            <div className="sec-card mb-4 rounded-lg p-4">
              <p className="sec-eyebrow mb-3">Accuracy by desk</p>
              <div className="space-y-2.5">
                {calibration.agents.map((agent) => (
                  <div key={agent.agent}>
                    <div className="mb-1 flex items-baseline justify-between gap-3">
                      <p className="truncate text-[0.8rem] font-bold">{agent.agent}</p>
                      <div className="flex shrink-0 items-baseline gap-2">
                        <span className="text-[0.68rem] font-semibold text-steel">
                          {agent.hit}/{agent.resolved || 0}
                        </span>
                        <span
                          className="text-[0.82rem] font-black tabular-nums"
                          style={{ color: accuracyColor(agent.accuracy) }}
                        >
                          {agent.accuracy === null ? "—" : `${agent.accuracy}%`}
                        </span>
                      </div>
                    </div>
                    <div className="sec-bar">
                      <div
                        className="sec-bar-fill"
                        style={{
                          width: `${agent.accuracy ?? 0}%`,
                          background: accuracyColor(agent.accuracy),
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {worst && worst.accuracy !== null && worst.accuracy < 50 ? (
                <p className="mt-4 text-[0.78rem] font-medium leading-6 text-steel">
                  Your {worst.agent} desk has been wrong more often than right. Weight its
                  conviction accordingly.
                </p>
              ) : null}
            </div>
          ) : null}

          {pending.length ? (
            <div className="sec-stagger space-y-2.5">
              {pending.map((item, index) => (
                <div
                  key={item.id}
                  style={{ animationDelay: `${index * 45}ms` }}
                  className={cn("sec-card sec-card-edge rounded-lg p-4 pl-5", item.overdue && "sec-card-due")}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="sec-eyebrow">{item.agent}</p>
                    <span className="text-[0.68rem] font-bold text-steel">
                      {item.overdue
                        ? "due now"
                        : `${item.days_remaining} day${item.days_remaining === 1 ? "" : "s"} left`}
                    </span>
                  </div>

                  <p className="mt-2 text-[0.88rem] font-semibold leading-7">{item.statement}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => resolve(item.id, "hit")} className="tr-btn tr-btn-hit">
                      <Check size={13} />
                      Right
                    </button>
                    <button type="button" onClick={() => resolve(item.id, "missed")} className="tr-btn tr-btn-miss">
                      <X size={13} />
                      Wrong
                    </button>
                    <button type="button" onClick={() => resolve(item.id, "void")} className="tr-btn">
                      <Minus size={13} />
                      Can&apos;t tell
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Target}
              title="No open predictions"
              body="Every board session commits each specialist to something falsifiable with a date on it. Run a session and they'll start putting their reputations on the line."
            />
          )}
        </>
      )}
    </SectionPanel>
  );
}

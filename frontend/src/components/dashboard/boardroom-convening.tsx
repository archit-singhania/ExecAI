"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Brain } from "lucide-react";
import { AgentReport } from "@/lib/api";
import { agentMeta } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

const DESK_ORDER = [
  "Market Research",
  "CFO",
  "CTO",
  "Sales",
  "Marketing",
  "Legal",
  "Operations",
  "Product",
  "Strategy",
];

function scoreColor(score: number) {
  if (score >= 85) return "#1d6f5f";
  if (score >= 70) return "#5b7ad6";
  if (score >= 50) return "#b7ca5d";
  return "#d45f3a";
}

function useCountUp(target: number, active: boolean, durationMs = 700) {
  const [value, setValue] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    if (!active || done.current) return;
    done.current = true;

    let raf = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, durationMs]);

  return value;
}

function Desk({
  name,
  report,
  index,
  total,
}: {
  name: string;
  report?: AgentReport;
  index: number;
  total: number;
}) {
  const filed = !!report;
  const meta = agentMeta[name];
  const Icon = meta?.icon ?? Brain;
  const score = useCountUp(report?.score ?? 0, filed);

  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const radius = 42;
  const left = 50 + Math.cos(angle) * radius;
  const top = 50 + Math.sin(angle) * radius;

  return (
    <div
      className={cn("bc-desk", filed && "bc-desk-filed")}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        ["--desk-accent" as string]: filed ? scoreColor(report.score) : "transparent",
      }}
    >
      <span className="bc-desk-icon">
        <Icon size={14} strokeWidth={2} />
      </span>
      <span className="bc-desk-body">
        <span className="bc-desk-name">{name}</span>
        <span className="bc-desk-score">{filed ? score : "—"}</span>
      </span>
    </div>
  );
}

export function BoardroomConvening({
  reports,
  active,
  finalText,
}: {
  reports: AgentReport[];
  active: boolean;
  finalText?: string;
}) {
  const byAgent = useMemo(() => {
    const map = new Map<string, AgentReport>();
    reports.forEach((report) => map.set(report.agent, report));
    return map;
  }, [reports]);

  const desks = useMemo(() => {
    const known = new Set(DESK_ORDER);
    const extra = reports.map((r) => r.agent).filter((name) => !known.has(name));
    return [...DESK_ORDER, ...Array.from(new Set(extra))];
  }, [reports]);

  const filed = reports.length;
  const total = desks.length;
  const settled = !!finalText;

  const average = filed
    ? Math.round(reports.reduce((sum, report) => sum + report.score, 0) / filed)
    : 0;
  const centreScore = useCountUp(average, settled);

  return (
    <div className={cn("bc", settled && "bc-settled")}>
      <div className="bc-ring" aria-hidden="true" />
      <div className="bc-ring bc-ring-outer" aria-hidden="true" />

      {desks.map((name, index) => (
        <Desk key={name} name={name} report={byAgent.get(name)} index={index} total={total} />
      ))}

      <div className="bc-centre">
        {settled ? (
          <>
            <span className="bc-centre-score" style={{ color: scoreColor(average) }}>
              {centreScore}
            </span>
            <span className="bc-centre-label">consensus</span>
          </>
        ) : (
          <>
            <span className="bc-centre-count">
              {filed}
              <span className="bc-centre-of">/{total}</span>
            </span>
            <span className="bc-centre-label">{active ? "deliberating" : "standing by"}</span>
          </>
        )}
      </div>

      <p className="bc-caption" role="status" aria-live="polite">
        {settled
          ? "The floor has reported. Verdict below."
          : active
            ? `${filed} of ${total} desks have filed`
            : "Ask a question to convene the board"}
      </p>
    </div>
  );
}

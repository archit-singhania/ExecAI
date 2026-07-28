"use client";

import { AgentReport } from "@/lib/api";
import { agentMeta } from "@/lib/dashboard-data";

export function KpiRunway({ reports }: { reports: AgentReport[]; opportunityScore?: number }) {
  const sorted = [...reports].sort((a, b) => b.score - a.score).slice(0, 6);
  const spread = sorted.length ? sorted[0].score - sorted[sorted.length - 1].score : 0;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="sec-eyebrow">Conviction by desk</p>
        <span className="text-[0.7rem] font-bold tabular-nums text-steel">{spread} pt spread</span>
      </div>

      {sorted.length ? (
        <div className="sec-stagger space-y-2.5">
          {sorted.map((report, index) => {
            const meta = agentMeta[report.agent];
            return (
              <div key={`${report.agent}-${report.title}`} style={{ animationDelay: `${index * 45}ms` }}>
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <p className="truncate text-[0.8rem] font-bold leading-5">{report.agent}</p>
                  <div className="flex shrink-0 items-baseline gap-2">
                    {meta ? <span className="sec-eyebrow">{meta.orbit}</span> : null}
                    <span className="text-[0.8rem] font-black tabular-nums">{report.score}</span>
                  </div>
                </div>
                <div className="sec-bar">
                  <div className="sec-bar-fill" style={{ width: `${Math.max(4, report.score)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-6 text-center text-[0.8rem] font-medium leading-6 text-steel">
          Conviction scores appear once your specialists have filed.
        </p>
      )}
    </div>
  );
}

"use client";

import { Activity, Files, Repeat, Target } from "lucide-react";
import { AgentReport } from "@/lib/api";
import { OperatingPhases } from "@/components/sections/operating-phases";
import { KpiRunway } from "@/components/sections/kpi-runway";
import { ConvictionSpread } from "@/components/dashboard/conviction-spread";
import { BoardRing } from "@/components/dashboard/board-ring";
import { DecisionTree } from "@/components/dashboard/decision-tree";
import {
  MetricRow,
  MetricStat,
  ScoreRing,
  SectionHeader,
  SectionPanel,
} from "@/components/dashboard/section-kit";

export function Operations({
  reports,
  opportunityScore,
  healthScore,
  runway,
  goal,
  verdict,
}: {
  reports: AgentReport[];
  opportunityScore: number;
  healthScore: number;
  runway: number;
  goal?: string;
  verdict?: string;
}) {
  const readout =
    opportunityScore >= 85
      ? "Strong conviction across the floor. Move."
      : opportunityScore >= 70
        ? "Validation approved. Full build blocked until proof."
        : "The floor is split. Narrow the wedge before spending.";

  return (
    <SectionPanel tone="slate">
      <SectionHeader
        eyebrow="Business intelligence"
        title="Operations"
        icon={Activity}
        meta={<ScoreRing score={opportunityScore} size={40} />}
      />

      <MetricRow>
        <MetricStat label="Opportunity" value={opportunityScore} hint="floor consensus" emphasis />
        <MetricStat label="Health" value={`${healthScore}%`} hint="company signal" />
        <MetricStat label="Runway" value={`${runway} mo`} hint="capital outlook" />
        <MetricStat label="Reports" value={reports.length} hint="on file" />
      </MetricRow>

      <div className="relative overflow-hidden rounded-lg bg-ink p-5 text-fog shadow-glow">
        <div className="executive-gradient absolute inset-0 opacity-60" />
        <div className="relative">
          <p className="text-[0.625rem] font-bold uppercase tracking-[0.18em] text-fog/50">Executive read</p>
          <p className="mt-2.5 max-w-xl text-xl font-bold leading-tight tracking-[-0.015em] sm:text-2xl">
            {readout}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <ReadChip icon={Files} label="Reports" value={`${reports.length}`} />
            <ReadChip icon={Repeat} label="Cadence" value="Weekly" />
            <ReadChip icon={Target} label="Runway" value={`${runway} months`} />
          </div>
        </div>
      </div>

      <div className="sec-card mt-4 rounded-lg p-4">
        <ConvictionSpread reports={reports} />
        <p className="sec-note mt-4 mb-0">
          Each dot is one desk. The band is the distance between the most and least convinced.
          A wide band is not a failure &mdash; it is the board telling you where the argument is.
        </p>
      </div>

      <div className="sec-card mt-4 rounded-lg p-4">
        <p className="sec-eyebrow mb-3">The floor, in the round</p>
        <BoardRing reports={reports} mode="ring" />
      </div>

      <div className="sec-card mt-4 rounded-lg p-4">
        <p className="sec-eyebrow mb-1">How the decision branches</p>
        <p className="sec-note">
          Your goal at the top, each desk beneath it, and what they want you to do. Click any
          node to read it in full.
        </p>
        <DecisionTree
          reports={reports}
          goal={goal ?? "Your current goal"}
          verdict={verdict}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="sec-card rounded-lg p-4">
          <KpiRunway reports={reports} />
        </div>
        <div className="sec-card rounded-lg p-4">
          <OperatingPhases />
        </div>
      </div>
    </SectionPanel>
  );
}

function ReadChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/10 px-3 py-2">
      <Icon size={14} className="shrink-0 text-fog/55" />
      <span className="text-[0.625rem] font-bold uppercase tracking-[0.14em] text-fog/55">{label}</span>
      <span className="text-[0.8rem] font-black tabular-nums">{value}</span>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import {
  BarChart,
  CHART_COLORS,
  ChartFrame,
  DonutChart,
  GaugeChart,
  Heatmap,
  Histogram,
  LineChart,
  RadarChart,
  ScatterPlot,
  StackedBarChart,
} from "@/components/charts/chart-kit";
import {
  BoxPlot,
  BubbleChart,
  BulletChart,
  FunnelChart,
  ProgressRings,
  SankeyFlow,
  StreamGraph,
  TimelineChart,
  Treemap,
  WaterfallChart,
} from "@/components/charts/chart-kit-advanced";
import {
  MetricRow,
  MetricStat,
  SectionHeader,
  SectionPanel,
  SkeletonCards,
} from "@/components/dashboard/section-kit";
import { getToken } from "@/lib/auth";
import { SceneField } from "@/components/ui/scene-field";
import { cn } from "@/lib/utils";

type Point = { label: string; value: number };

type Overview = {
  window_days: number;
  has_data: boolean;
  health_trend: Point[];
  score_by_agent: Point[];
  score_distribution: number[];
  task_flow: { label: string; created: number; closed: number }[];
  task_priority: Point[];
  task_status: Point[];
  activity_heatmap: { day: string; value: number }[];
  agent_radar: Point[];
  prediction_accuracy: Point[];
  confidence_vs_outcome: { label: string; x: number; y: number }[];
  message_volume: Point[];
  totals: Record<string, number>;
  effort_split?: Point[];
  agent_flow?: { from: string; to: string; value: number }[];
  score_spread?: { label: string; values: number[] }[];
  score_movement?: { label: string; delta: number }[];
  session_funnel?: Point[];
  impact_bubbles?: { label: string; x: number; y: number; size: number }[];
  phase_timeline?: { label: string; start: number; end: number }[];
  goal_progress?: { label: string; value: number; target: number; max: number }[];
  ring_progress?: Point[];
  activity_streams?: { labels: string[]; series: { name: string; values: number[] }[] };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const DEMO: Overview = {
  window_days: 30,
  has_data: true,
  health_trend: [
    { label: "05-02", value: 61 }, { label: "05-05", value: 64 }, { label: "05-09", value: 63 },
    { label: "05-13", value: 70 }, { label: "05-17", value: 74 }, { label: "05-21", value: 72 },
    { label: "05-25", value: 79 }, { label: "05-29", value: 83 },
  ],
  score_by_agent: [
    { label: "CTO", value: 86 }, { label: "Product", value: 81 }, { label: "CFO", value: 78 },
    { label: "Sales", value: 74 }, { label: "Legal", value: 71 }, { label: "Marketing", value: 64 },
  ],
  score_distribution: [58, 62, 64, 67, 68, 71, 71, 73, 74, 76, 78, 79, 81, 83, 86, 88, 72, 69, 77, 80],
  task_flow: [
    { label: "05-13", created: 5, closed: 1 }, { label: "05-16", created: 3, closed: 4 },
    { label: "05-19", created: 6, closed: 2 }, { label: "05-22", created: 2, closed: 5 },
    { label: "05-25", created: 4, closed: 3 }, { label: "05-28", created: 3, closed: 6 },
  ],
  task_priority: [{ label: "High", value: 7 }, { label: "Medium", value: 12 }, { label: "Low", value: 5 }],
  task_status: [{ label: "Done", value: 14 }, { label: "Open", value: 10 }],
  activity_heatmap: Array.from({ length: 31 }).map((_, index) => ({
    day: `d${index}`,
    value: [0, 0, 1, 3, 2, 0, 4, 6, 1, 0, 2, 5, 3, 0, 0, 1, 4, 7, 2, 1, 0, 3, 5, 2, 0, 1, 6, 4, 2, 0, 3][index],
  })),
  agent_radar: [
    { label: "CTO", value: 86 }, { label: "Product", value: 81 }, { label: "CFO", value: 78 },
    { label: "Sales", value: 74 }, { label: "Legal", value: 71 }, { label: "Marketing", value: 64 },
  ],
  prediction_accuracy: [
    { label: "CTO", value: 83 }, { label: "CFO", value: 67 },
    { label: "Product", value: 60 }, { label: "Marketing", value: 40 },
  ],
  confidence_vs_outcome: [
    { label: "CTO", x: 88, y: 100 }, { label: "CFO", x: 71, y: 100 }, { label: "CFO", x: 64, y: 0 },
    { label: "Marketing", x: 58, y: 0 }, { label: "Sales", x: 84, y: 100 }, { label: "Product", x: 77, y: 0 },
    { label: "Legal", x: 69, y: 100 },
  ],
  message_volume: [
    { label: "05-16", value: 4 }, { label: "05-19", value: 9 }, { label: "05-22", value: 6 },
    { label: "05-25", value: 12 }, { label: "05-28", value: 8 },
  ],
  totals: { sessions: 3, reports: 27, tasks: 24, tasks_done: 14, predictions: 18, predictions_resolved: 11 },
  effort_split: [
    { label: "Product", value: 34 }, { label: "Growth", value: 26 }, { label: "Finance", value: 18 },
    { label: "Legal", value: 12 }, { label: "Ops", value: 10 },
  ],
  agent_flow: [
    { from: "Market", to: "Validate", value: 12 }, { from: "CFO", to: "Validate", value: 8 },
    { from: "CTO", to: "Build", value: 14 }, { from: "Product", to: "Build", value: 9 },
    { from: "Sales", to: "Sell", value: 11 }, { from: "Marketing", to: "Sell", value: 7 },
  ],
  score_spread: [
    { label: "CTO", values: [78, 82, 84, 86, 88, 91] },
    { label: "CFO", values: [62, 68, 71, 74, 79, 84] },
    { label: "Sales", values: [58, 64, 70, 74, 77, 82] },
    { label: "Marketing", values: [48, 54, 58, 62, 68, 74] },
  ],
  score_movement: [
    { label: "Start", delta: 61 }, { label: "Validation", delta: 8 }, { label: "Pricing", delta: -5 },
    { label: "Pilot", delta: 12 }, { label: "Churn", delta: -7 }, { label: "Now", delta: 14 },
  ],
  session_funnel: [
    { label: "Sessions started", value: 24 }, { label: "Reports filed", value: 21 },
    { label: "Tasks created", value: 16 }, { label: "Tasks closed", value: 9 },
    { label: "Predictions resolved", value: 5 },
  ],
  impact_bubbles: [
    { label: "Pricing test", x: 72, y: 84, size: 20 }, { label: "Onboarding", x: 48, y: 61, size: 14 },
    { label: "Cold outreach", x: 84, y: 38, size: 9 }, { label: "Docs", x: 26, y: 44, size: 6 },
    { label: "Referrals", x: 58, y: 72, size: 16 },
  ],
  phase_timeline: [
    { label: "Discovery", start: 0, end: 18 }, { label: "Validation", start: 12, end: 40 },
    { label: "Build", start: 34, end: 72 }, { label: "Pilot", start: 62, end: 92 },
    { label: "Launch", start: 84, end: 100 },
  ],
  goal_progress: [
    { label: "Signups", value: 62, target: 100, max: 140 },
    { label: "Pilots", value: 4, target: 5, max: 10 },
    { label: "Revenue", value: 780, target: 1000, max: 1500 },
    { label: "Retention", value: 48, target: 60, max: 100 },
  ],
  ring_progress: [
    { label: "Validation", value: 82 }, { label: "Build", value: 64 },
    { label: "Sales", value: 41 }, { label: "Ops", value: 27 },
  ],
  activity_streams: {
    labels: ["W1", "W2", "W3", "W4", "W5", "W6"],
    series: [
      { name: "Reports", values: [4, 7, 6, 9, 8, 12] },
      { name: "Tasks", values: [2, 5, 8, 6, 9, 7] },
      { name: "Messages", values: [6, 4, 9, 11, 7, 10] },
    ],
  },
};

function toWeeks(cells: { day: string; value: number }[]) {
  const weeks: { day: string; value: number }[][] = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return weeks;
}

export function Analytics({ isDemo }: { isDemo?: boolean }) {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [window, setWindow] = useState(30);

  const load = useCallback(async () => {
    if (isDemo) {
      setData(DEMO);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/analytics/overview?days=${window}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: "no-store",
      });
      if (response.ok) setData(await response.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [isDemo, window]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = data?.totals ?? {};
  const completion = totals.tasks ? Math.round((totals.tasks_done / totals.tasks) * 100) : 0;

  return (
    <SectionPanel tone="cobalt">
      <SceneField id="analytics" variant="topography" className="opacity-50" />
      <SectionHeader
        eyebrow="Analytics"
        title="Business intelligence"
        icon={BarChart3}
        actions={
          !isDemo ? (
            <div className="sec-rail flex gap-1 p-1">
              {[7, 30, 90].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setWindow(option)}
                  className={cn("sec-rail-item", window === option && "sec-rail-item-active")}
                >
                  {option}d
                </button>
              ))}
            </div>
          ) : null
        }
      />

      <MetricRow>
        <MetricStat label="Sessions" value={totals.sessions ?? 0} hint="all time" emphasis />
        <MetricStat label="Reports filed" value={totals.reports ?? 0} hint={`last ${data?.window_days ?? 30} days`} />
        <MetricStat label="Task completion" value={`${completion}%`} hint={`${totals.tasks_done ?? 0} of ${totals.tasks ?? 0}`} />
        <MetricStat label="Calls resolved" value={totals.predictions_resolved ?? 0} hint={`of ${totals.predictions ?? 0}`} />
      </MetricRow>

      {loading ? (
        <SkeletonCards count={4} />
      ) : !data?.has_data ? (
        <p className="py-10 text-center text-[0.85rem] font-medium leading-7 text-steel">
          Run a board session and the charts fill in. Nothing here is simulated.
        </p>
      ) : (
        <div className="grid gap-3">
          <ChartFrame title="Board conviction over time" hint="Mean agent score per day">
            <LineChart
              area
              series={[{ name: "Conviction", color: CHART_COLORS[0], points: data.health_trend }]}
            />
          </ChartFrame>

          <div className="chart-grid-2">
            <ChartFrame title="Average score by desk" hint="Who is most bullish">
              <BarChart horizontal points={data.score_by_agent} color={CHART_COLORS[1]} />
            </ChartFrame>

            <ChartFrame title="Desk profile" hint="Conviction shape across the floor">
              <RadarChart points={data.agent_radar} color={CHART_COLORS[4]} />
            </ChartFrame>
          </div>

          <div className="chart-grid-2">
            <ChartFrame title="Task flow" hint="Created against closed">
              <StackedBarChart
                labels={data.task_flow.map((entry) => entry.label)}
                series={[
                  { name: "Closed", color: CHART_COLORS[1], values: data.task_flow.map((e) => e.closed) },
                  { name: "Created", color: CHART_COLORS[2], values: data.task_flow.map((e) => e.created) },
                ]}
              />
            </ChartFrame>

            <ChartFrame title="Task priority" hint="Where the weight sits">
              <DonutChart points={data.task_priority} centerLabel="tasks" />
            </ChartFrame>
          </div>

          <div className="chart-grid-2">
            <ChartFrame title="Score distribution" hint="How opinions cluster">
              <Histogram values={data.score_distribution} color={CHART_COLORS[5]} />
            </ChartFrame>

            <ChartFrame title="Message volume" hint="Sessions per day">
              <BarChart points={data.message_volume} color={CHART_COLORS[6]} />
            </ChartFrame>
          </div>

          <ChartFrame title="Activity" hint="Every report and message, by day">
            <Heatmap weeks={toWeeks(data.activity_heatmap)} color={CHART_COLORS[1]} />
          </ChartFrame>

          <div className="chart-grid-2">
            <ChartFrame title="Prediction accuracy" hint="How often each desk is right">
              <BarChart horizontal points={data.prediction_accuracy} color={CHART_COLORS[3]} />
            </ChartFrame>

            <ChartFrame
              title="Confidence against outcome"
              hint="High confidence at the bottom means overconfidence"
            >
              <ScatterPlot
                points={data.confidence_vs_outcome.map((entry, index) => ({
                  ...entry,
                  color: CHART_COLORS[index % CHART_COLORS.length],
                }))}
                xLabel="stated confidence"
                yLabel="outcome"
              />
            </ChartFrame>
          </div>

          <div className="chart-grid-2">
            <ChartFrame title="Completion rate" hint="Tasks closed against created">
              <div className="grid place-items-center py-2">
                <GaugeChart value={completion} label="complete" color={CHART_COLORS[1]} />
              </div>
            </ChartFrame>

            <ChartFrame title="Open against done" hint="Current board state">
              <DonutChart points={data.task_status} centerLabel="tasks" />
            </ChartFrame>
          </div>

          <div className="chart-grid-2">
            <ChartFrame title="Where effort goes" hint="Share of board attention by area">
              <Treemap points={data.effort_split ?? []} />
            </ChartFrame>

            <ChartFrame title="Desk to outcome" hint="Which specialists drive which decisions">
              <SankeyFlow links={data.agent_flow ?? []} />
            </ChartFrame>
          </div>

          <div className="chart-grid-2">
            <ChartFrame title="Score range by desk" hint="Median, quartiles and outliers">
              <BoxPlot groups={data.score_spread ?? []} color={CHART_COLORS[0]} />
            </ChartFrame>

            <ChartFrame title="What moved the score" hint="Cumulative effect of each decision">
              <WaterfallChart steps={data.score_movement ?? []} />
            </ChartFrame>
          </div>

          <div className="chart-grid-2">
            <ChartFrame title="Session funnel" hint="Where momentum is lost">
              <FunnelChart stages={data.session_funnel ?? []} />
            </ChartFrame>

            <ChartFrame title="Effort against impact" hint="Bubble size is board conviction">
              <BubbleChart points={data.impact_bubbles ?? []} />
            </ChartFrame>
          </div>

          <div className="chart-grid-2">
            <ChartFrame title="Operating phases" hint="Overlap across the roadmap">
              <TimelineChart items={data.phase_timeline ?? []} />
            </ChartFrame>

            <ChartFrame title="Goals against target" hint="The marker is the commitment">
              <BulletChart rows={data.goal_progress ?? []} />
            </ChartFrame>
          </div>

          <div className="chart-grid-2">
            <ChartFrame title="Progress by workstream" hint="Concentric completion">
              <ProgressRings rings={data.ring_progress ?? []} />
            </ChartFrame>

            <ChartFrame title="Activity mix over time" hint="Reports, tasks and messages">
              <StreamGraph
                labels={data.activity_streams?.labels ?? []}
                series={data.activity_streams?.series ?? []}
              />
            </ChartFrame>
          </div>
        </div>
      )}
    </SectionPanel>
  );
}

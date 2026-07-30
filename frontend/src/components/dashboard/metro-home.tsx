"use client";

import {
  Activity,
  BarChart3,
  CircleDollarSign,
  Gauge,
  ListChecks,
  LogOut,
  MessagesSquare,
  Presentation,
  RefreshCcw,
  Settings,
  Target,
  Users2,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { AuthUser } from "@/lib/auth";
import { DashboardTab } from "@/lib/dashboard-data";
import { MetroTile } from "@/components/dashboard/metro-tile";
import { cn } from "@/lib/utils";

function shapeFrom(seed: number, length = 7): number[] {
  const points: number[] = [];
  let value = Math.max(8, seed * 0.55);

  for (let index = 0; index < length; index += 1) {
    const wave = Math.sin((seed + index * 1.7) * 0.9) * (seed * 0.08 + 2);
    value = value + wave + (seed - value) * 0.22;
    points.push(Math.max(1, value));
  }

  points[points.length - 1] = Math.max(1, seed);
  return points;
}

export function MetroHome({
  user,
  isDemo,
  onLogout,
  onSelectTab,
  onStartNewSession,
  healthScore,
  runway,
  doneTasks,
  taskCount,
  reportCount = 0,
  opportunityScore = 0,
  plan,
}: {
  user: AuthUser | null;
  isDemo: boolean;
  onLogout: () => void;
  onSelectTab: (tab: DashboardTab, rect?: DOMRect) => void;
  onStartNewSession: () => void;
  healthScore: number;
  runway: number;
  doneTasks: number;
  taskCount: number;
  reportCount?: number;
  opportunityScore?: number;
  plan?: { name: string; tier: string; runsUsed: number; runsIncluded: number; nearLimit: boolean };
}) {
  const completion = taskCount ? Math.round((doneTasks / taskCount) * 100) : 0;
  const openTasks = Math.max(0, taskCount - doneTasks);
  const name = user?.name ?? (isDemo ? "Demo session" : "Account");
  const initial = name.trim().charAt(0).toUpperCase() || "C";

  return (
    <div className="mh relative flex h-full min-w-0 flex-1 flex-col gap-3">
      <header className="mh-bar relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-xl px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-3">
          <Logo size={30} />
          <span className="mh-rule" aria-hidden="true" />
          <div className="mh-avatar" aria-hidden="true">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight tracking-[-0.01em]">{name}</p>
            <p className="truncate text-[0.7rem] font-semibold leading-tight text-steel">
              {isDemo ? "Sample data · nothing is saved" : user?.email ?? ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {plan ? (
            <Link
              href="/pricing"
              className={cn("mh-usage", plan.nearLimit && "mh-usage-low")}
              title={`${plan.runsUsed} of ${plan.runsIncluded} board runs used`}
            >
              <span className="mh-tier">{plan.name}</span>
              <span className="mh-usage-bar">
                <span
                  className="mh-usage-fill"
                  style={{
                    width: `${Math.min(100, (plan.runsUsed / Math.max(1, plan.runsIncluded)) * 100)}%`,
                  }}
                />
              </span>
              <span className="text-[0.68rem] font-bold tabular-nums text-steel">
                {plan.runsUsed}/{plan.runsIncluded}
              </span>
            </Link>
          ) : null}

          <div className="mh-pills hidden items-center gap-1 md:flex">
            <span className="mh-pill">
              <span className="mh-pill-label">Health</span>
              <span className="mh-pill-value">{healthScore}%</span>
            </span>
            <span className="mh-pill">
              <span className="mh-pill-label">Runway</span>
              <span className="mh-pill-value">{runway}mo</span>
            </span>
            <span className="mh-pill">
              <span className="mh-pill-label">Open</span>
              <span className="mh-pill-value">{openTasks}</span>
            </span>
          </div>

          {isDemo ? (
            <Link href="/signup" className="mh-btn">
              Sign up to save this
            </Link>
          ) : null}

          <Link href="/settings" className="mh-btn" title="Account settings">
            <Settings size={14} />
            <span className="hidden sm:inline">Settings</span>
          </Link>

          <button type="button" onClick={onLogout} className="mh-btn mh-btn-danger">
            <LogOut size={14} />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </header>

      <div className="mh-deck command-scroll relative z-10 min-h-0 flex-1 overflow-y-auto rounded-xl p-2 sm:p-3">
        <div className="mh-grid">
          <MetroTile
            label="Chat with the CEO"
            eyebrow="Command channel"
            stat="Open the boardroom"
            status="Live"
            icon={MessagesSquare}
            tone="midnight"
            size="2x2"
            onClick={(rect) => onSelectTab("chat", rect)}
          />

          <MetroTile
            label="Agent briefing"
            eyebrow="Intelligence desk"
            stat={reportCount ? `${reportCount}` : "—"}
            delta={reportCount ? "filed" : undefined}
            status={reportCount ? "Reporting" : "Idle"}
            trend={reportCount ? shapeFrom(reportCount) : undefined}
            icon={Users2}
            tone="ink"
            onClick={(rect) => onSelectTab("agents", rect)}
          />

          <MetroTile
            label="Task board"
            eyebrow="Execution layer"
            stat={`${doneTasks}/${taskCount}`}
            delta={`${completion}%`}
            status={openTasks ? `${openTasks} open` : "Clear"}
            progress={completion}
            icon={ListChecks}
            tone="cobalt"
            onClick={(rect) => onSelectTab("tasks", rect)}
          />

          <MetroTile
            label="Board & memory"
            eyebrow="Decision archive"
            stat="Weekly"
            delta="review"
            status="Scheduled"
            icon={Presentation}
            tone="teal"
            onClick={(rect) => onSelectTab("board", rect)}
          />

          <MetroTile
            label="Operations"
            eyebrow="Operating rhythm"
            stat={opportunityScore ? `${opportunityScore}` : "—"}
            delta={opportunityScore ? "consensus" : undefined}
            trend={opportunityScore ? shapeFrom(opportunityScore) : undefined}
            status="Signal"
            icon={Activity}
            tone="slate"
            onClick={(rect) => onSelectTab("operations", rect)}
          />

          <MetroTile
            label="Health score"
            eyebrow="Company signal"
            stat={`${healthScore}%`}
            progress={healthScore}
            trend={shapeFrom(healthScore)}
            status="Tracking"
            icon={Gauge}
            tone="plum"
            onClick={(rect) => onSelectTab("operations", rect)}
          />

          <MetroTile
            label="Runway"
            eyebrow="Capital outlook"
            stat={`${runway}`}
            delta="months"
            trend={shapeFrom(runway * 4)}
            status={runway < 6 ? "Tight" : "Stable"}
            icon={CircleDollarSign}
            tone="ink"
            onClick={(rect) => onSelectTab("operations", rect)}
          />

          <MetroTile
            label="Analytics"
            eyebrow="Business intelligence"
            stat="12 views"
            status="Live data"
            icon={BarChart3}
            tone="cobalt"
            onClick={(rect) => onSelectTab("analytics", rect)}
          />

          <MetroTile
            label="Track record"
            eyebrow="Accountability"
            stat="Score the board"
            status="Open calls"
            icon={Target}
            tone="plum"
            onClick={(rect) => onSelectTab("record", rect)}
          />

          <MetroTile
            label="Start new session"
            eyebrow="New workstream"
            stat="Fresh CEO run"
            status="Ready"
            icon={RefreshCcw}
            tone="midnight"
            size="wide"
            onClick={onStartNewSession}
          />
        </div>
      </div>
    </div>
  );
}

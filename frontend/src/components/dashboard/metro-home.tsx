"use client";

import {
  Activity,
  CircleDollarSign,
  Gauge,
  ListChecks,
  LogOut,
  MessagesSquare,
  Presentation,
  RefreshCcw,
  Users2,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { AuthUser } from "@/lib/auth";
import { DashboardTab } from "@/lib/dashboard-data";
import { MetroTile } from "@/components/dashboard/metro-tile";

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
}: {
  user: AuthUser | null;
  isDemo: boolean;
  onLogout: () => void;
  onSelectTab: (tab: DashboardTab) => void;
  onStartNewSession: () => void;
  healthScore: number;
  runway: number;
  doneTasks: number;
  taskCount: number;
}) {
  return (
    <div className="metro-grid-fade flex h-full min-w-0 flex-1 flex-col gap-3 sm:gap-4">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg px-1 py-1">
        <div className="flex items-center gap-2.5">
          <Logo size={34} />
          <div>
            <p className="text-sm font-black leading-tight">{user?.name ?? (isDemo ? "Demo session" : "Account")}</p>
            <p className="text-[0.7rem] font-semibold leading-tight text-steel">
              {isDemo ? "Sample data · nothing is saved" : user?.email ?? ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isDemo ? (
            <Link
              href="/signup"
              className="rounded-md border border-ink/10 bg-white/60 px-3 py-2 text-xs font-bold text-steel transition hover:border-ink/25 hover:text-ink dark:border-fog/10 dark:bg-white/5 dark:hover:border-fog/25"
            >
              Sign up to save this
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-1.5 rounded-md border border-ink/10 bg-white/60 px-3 py-2 text-xs font-bold text-steel transition hover:border-ember/40 hover:text-ember dark:border-fog/10 dark:bg-white/5"
          >
            <LogOut size={15} />
            <span className="hidden sm:inline">Log out</span>
          </button>
        </div>
      </div>

      <div className="command-scroll min-h-0 flex-1 overflow-y-auto rounded-lg">
        <div className="grid auto-rows-[minmax(120px,1fr)] grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
          <MetroTile
            label="Chat with the CEO"
            stat="Open the boardroom"
            icon={MessagesSquare}
            tone="accent"
            size="2x2"
            onClick={() => onSelectTab("chat")}
          />

          <MetroTile
            label="Agent briefing"
            stat="Specialist reports"
            icon={Users2}
            tone="ink"
            size="1x1"
            onClick={() => onSelectTab("agents")}
          />

          <MetroTile
            label="Task board"
            stat={`${doneTasks}/${taskCount} done`}
            icon={ListChecks}
            tone="ember"
            size="1x1"
            onClick={() => onSelectTab("tasks")}
          />

          <MetroTile
            label="Board & memory"
            stat="Weekly reviews"
            icon={Presentation}
            tone="basil"
            size="1x1"
            onClick={() => onSelectTab("board")}
          />

          <MetroTile
            label="Operations"
            stat="Roadmap & signal"
            icon={Activity}
            tone="steel"
            size="1x1"
            onClick={() => onSelectTab("operations")}
          />

          <MetroTile
            label="Health score"
            stat={`${healthScore}%`}
            icon={Gauge}
            tone="chartreuse"
            size="1x1"
            onClick={() => onSelectTab("operations")}
          />

          <MetroTile
            label="Runway"
            stat={`${runway} months`}
            icon={CircleDollarSign}
            tone="ink"
            size="1x1"
            onClick={() => onSelectTab("operations")}
          />

          <MetroTile
            label="Start new session"
            stat="Fresh CEO run"
            icon={RefreshCcw}
            tone="accent"
            size="wide"
            onClick={onStartNewSession}
          />
        </div>
      </div>
    </div>
  );
}

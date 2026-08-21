"use client";

import {
  Activity,
  BarChart3,
  ListChecks,
  MessagesSquare,
  Presentation,
  Target,
  Users2,
} from "lucide-react";
import { DashboardTab } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

const PRIMARY: { tab: DashboardTab; label: string; icon: React.ElementType }[] = [
  { tab: "chat", label: "Board", icon: MessagesSquare },
  { tab: "agents", label: "Reports", icon: Users2 },
  { tab: "tasks", label: "Tasks", icon: ListChecks },
  { tab: "record", label: "Record", icon: Target },
];

const MORE: { tab: DashboardTab; label: string; icon: React.ElementType }[] = [
  { tab: "operations", label: "Operations", icon: Activity },
  { tab: "analytics", label: "Analytics", icon: BarChart3 },
  { tab: "board", label: "Board room", icon: Presentation },
];

export function MobileTabBar({
  activeTab,
  onSelectTab,
  openTasks = 0,
}: {
  activeTab: DashboardTab | null;
  onSelectTab: (tab: DashboardTab | null) => void;
  openTasks?: number;
}) {
  return (
    <nav className="mtb lg:hidden" aria-label="Sections">
      <div className="mtb-inner">
        <button
          type="button"
          onClick={() => {
            if ("vibrate" in navigator) navigator.vibrate(30);
            onSelectTab(null);
          }}
          aria-current={activeTab === null}
          className={cn("mtb-item", activeTab === null && "mtb-item-on")}
        >
          <span className="mtb-icon">
            <span className="mtb-home" />
          </span>
          <span className="mtb-label">Home</span>
        </button>

        {PRIMARY.map((entry) => {
          const active = activeTab === entry.tab;
          const badge = entry.tab === "tasks" && openTasks > 0 ? openTasks : null;

          return (
            <button
              key={entry.tab}
              type="button"
              onClick={() => {
                if ("vibrate" in navigator) navigator.vibrate(30);
                onSelectTab(entry.tab);
              }}
              aria-current={active}
              className={cn("mtb-item", active && "mtb-item-on")}
            >
              <span className="mtb-icon">
                <entry.icon size={19} strokeWidth={active ? 2.3 : 1.9} />
                {badge ? <span className="mtb-badge">{badge > 9 ? "9+" : badge}</span> : null}
              </span>
              <span className="mtb-label">{entry.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function MobileQuickGrid({
  onSelectTab,
}: {
  onSelectTab: (tab: DashboardTab) => void;
}) {
  return (
    <div className="mqg lg:hidden">
      {MORE.map((entry) => (
        <button
          key={entry.tab}
          type="button"
          onClick={() => onSelectTab(entry.tab)}
          className="mqg-item lg lg-thin lg-interactive"
        >
          <span className="mqg-icon">
            <entry.icon size={17} strokeWidth={1.9} />
          </span>
          <span className="mqg-label">{entry.label}</span>
        </button>
      ))}
    </div>
  );
}

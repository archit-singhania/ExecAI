"use client";

import { LayoutDashboard, MessagesSquare, Users2, ListChecks, Presentation, Activity, LogOut } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { DashboardTab } from "@/lib/dashboard-data";
import { AuthUser } from "@/lib/auth";

const NAV_ITEMS: Array<{ tab: DashboardTab; label: string; icon: React.ElementType }> = [
  { tab: "overview", label: "Overview", icon: LayoutDashboard },
  { tab: "chat", label: "Chat", icon: MessagesSquare },
  { tab: "agents", label: "Agents", icon: Users2 },
  { tab: "tasks", label: "Tasks", icon: ListChecks },
  { tab: "board", label: "Board & Memory", icon: Presentation },
  { tab: "operations", label: "Operations", icon: Activity },
];

export function DashboardSidebar({
  activeTab,
  onSelectTab,
  user,
  onLogout,
}: {
  activeTab: DashboardTab;
  onSelectTab: (tab: DashboardTab) => void;
  user: AuthUser | null;
  onLogout: () => void;
}) {
  return (
    <aside className="glass-strong flex h-full w-16 shrink-0 flex-col items-center gap-2 rounded-lg py-3 sm:w-[76px] lg:w-56 lg:items-stretch lg:px-3">
      <div className="mb-2 flex items-center justify-center gap-2.5 px-1 lg:justify-start lg:px-1">
        <Logo size={32} />
        <span className="hidden text-sm font-black tracking-tight lg:inline">CEO.ai</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ tab, label, icon: Icon }) => {
          const active = tab === activeTab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => onSelectTab(tab)}
              title={label}
              className={cn(
                "flex items-center justify-center gap-2.5 rounded-md px-2.5 py-2.5 text-xs font-bold transition lg:justify-start",
                active
                  ? "bg-ink text-fog shadow-soft dark:bg-white/10 dark:text-fog"
                  : "text-steel hover:bg-ink/5 hover:text-ink dark:hover:bg-white/5",
              )}
            >
              <Icon size={18} className="shrink-0" />
              <span className="hidden lg:inline">{label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-1 border-t border-ink/10 pt-2 dark:border-fog/10">
        <div className="hidden truncate px-2.5 py-1 lg:block">
          <p className="truncate text-xs font-black leading-tight">{user?.name ?? "Account"}</p>
          <p className="truncate text-[0.65rem] font-semibold text-steel">{user?.email ?? ""}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          title="Log out"
          className="flex items-center justify-center gap-2.5 rounded-md px-2.5 py-2.5 text-xs font-bold text-steel transition hover:bg-ember/10 hover:text-ember lg:justify-start"
        >
          <LogOut size={18} className="shrink-0" />
          <span className="hidden lg:inline">Log out</span>
        </button>
      </div>
    </aside>
  );
}

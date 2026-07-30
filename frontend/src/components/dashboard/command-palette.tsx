"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  CornerDownLeft,
  CreditCard,
  FileText,
  Gauge,
  ListChecks,
  LogOut,
  MessagesSquare,
  Moon,
  PlayCircle,
  Presentation,
  RefreshCcw,
  Search,
  Settings,
  Target,
  Users2,
} from "lucide-react";
import { AgentReport, Task } from "@/lib/api";
import { DashboardTab } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

export type Command = {
  id: string;
  label: string;
  hint: string;
  group: string;
  icon: React.ElementType;
  run: () => void;
};

export function CommandPalette({
  onSelectTab,
  onStartNewSession,
  onBoardReview,
  onLogout,
  onReplayTour,
  reports = [],
  tasks = [],
  onOpenReport,
}: {
  onSelectTab: (tab: DashboardTab) => void;
  onStartNewSession: () => void;
  onBoardReview: () => void;
  onLogout: () => void;
  onReplayTour?: () => void;
  reports?: AgentReport[];
  tasks?: Task[];
  onOpenReport?: (report: AgentReport) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setCursor(0);
  }, []);

  const commands = useMemo<Command[]>(() => {
    const go = (tab: DashboardTab) => () => {
      onSelectTab(tab);
      close();
    };

    return [
      { id: "chat", label: "Chat with the CEO", hint: "Open the boardroom", group: "Navigate", icon: MessagesSquare, run: go("chat") },
      { id: "agents", label: "Agent briefing", hint: "Specialist reports", group: "Navigate", icon: Users2, run: go("agents") },
      { id: "tasks", label: "Task board", hint: "Execution layer", group: "Navigate", icon: ListChecks, run: go("tasks") },
      { id: "board", label: "Board and memory", hint: "Decision archive", group: "Navigate", icon: Presentation, run: go("board") },
      { id: "operations", label: "Operations", hint: "Conviction spread and runway", group: "Navigate", icon: Activity, run: go("operations") },
      { id: "record", label: "Track record", hint: "How often each desk is right", group: "Navigate", icon: Target, run: go("record") },
      { id: "analytics", label: "Analytics", hint: "Charts across every session", group: "Navigate", icon: BarChart3, run: go("analytics") },
      {
        id: "new-session",
        label: "Start a new session",
        hint: "Fresh CEO run",
        group: "Actions",
        icon: RefreshCcw,
        run: () => {
          onStartNewSession();
          close();
        },
      },
      {
        id: "board-review",
        label: "Run a board review",
        hint: "Score progress now",
        group: "Actions",
        icon: Gauge,
        run: () => {
          onBoardReview();
          close();
        },
      },
      {
        id: "theme",
        label: "Toggle dark mode",
        hint: "Switch appearance",
        group: "Actions",
        icon: Moon,
        run: () => {
          document.documentElement.classList.toggle("dark");
          close();
        },
      },
      {
        id: "tour",
        label: "Replay the tour",
        hint: "Four short clips",
        group: "Actions",
        icon: PlayCircle,
        run: () => {
          onReplayTour?.();
          close();
        },
      },
      {
        id: "settings",
        label: "Account settings",
        hint: "Profile, password, data",
        group: "Account",
        icon: Settings,
        run: () => {
          router.push("/settings");
          close();
        },
      },
      {
        id: "pricing",
        label: "Plans and billing",
        hint: "Compare tiers",
        group: "Account",
        icon: CreditCard,
        run: () => {
          router.push("/pricing");
          close();
        },
      },
      {
        id: "logout",
        label: "Log out",
        hint: "End this session",
        group: "Account",
        icon: LogOut,
        run: () => {
          onLogout();
          close();
        },
      },
    ];
  }, [close, onBoardReview, onLogout, onReplayTour, onSelectTab, onStartNewSession, router]);

  const contentCommands = useMemo<Command[]>(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];

    const matchedReports = reports
      .filter(
        (report) =>
          report.title.toLowerCase().includes(needle) ||
          report.summary.toLowerCase().includes(needle) ||
          report.agent.toLowerCase().includes(needle),
      )
      .slice(0, 5)
      .map<Command>((report) => ({
        id: `report-${report.id ?? report.title}`,
        label: report.title,
        hint: `${report.agent} · ${report.score}`,
        group: "Reports",
        icon: FileText,
        run: () => {
          onSelectTab("agents");
          onOpenReport?.(report);
          close();
        },
      }));

    const matchedTasks = tasks
      .filter((task) => task.title.toLowerCase().includes(needle))
      .slice(0, 5)
      .map<Command>((task) => ({
        id: `task-${task.id}`,
        label: task.title,
        hint: `${task.priority} · ${task.status}`,
        group: "Tasks",
        icon: ListChecks,
        run: () => {
          onSelectTab("tasks");
          close();
        },
      }));

    return [...matchedReports, ...matchedTasks];
  }, [close, onOpenReport, onSelectTab, query, reports, tasks]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return commands;

    const matched = commands.filter(
      (command) =>
        command.label.toLowerCase().includes(needle) ||
        command.hint.toLowerCase().includes(needle) ||
        command.group.toLowerCase().includes(needle),
    );

    return [...matched, ...contentCommands];
  }, [commands, contentCommands, query]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
        return;
      }
      if (event.key === "Escape" && open) {
        event.preventDefault();
        close();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, open]);

  useEffect(() => {
    if (open) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      window.setTimeout(() => inputRef.current?.focus(), 20);
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [open]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>(`[data-index="${cursor}"]`);
    node?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  if (!open) return null;

  function onInputKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((current) => (current + 1) % Math.max(1, results.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((current) => (current - 1 + results.length) % Math.max(1, results.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      results[cursor]?.run();
    }
  }

  let lastGroup = "";

  return (
    <div className="cmdk-root" role="dialog" aria-modal="true" aria-label="Command palette">
      <button type="button" className="cmdk-scrim" aria-label="Close" onClick={close} />

      <div className="cmdk-panel">
        <div className="cmdk-search">
          <Search size={15} className="shrink-0 text-steel" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onInputKey}
            placeholder="Search commands, reports, tasks…"
            className="cmdk-input"
            aria-label="Search commands"
          />
          <kbd className="cmdk-kbd">esc</kbd>
        </div>

        <div ref={listRef} className="cmdk-list">
          {results.length ? (
            results.map((command, index) => {
              const Icon = command.icon;
              const showGroup = command.group !== lastGroup;
              lastGroup = command.group;

              return (
                <div key={command.id}>
                  {showGroup ? <p className="cmdk-group">{command.group}</p> : null}
                  <button
                    type="button"
                    data-index={index}
                    onMouseEnter={() => setCursor(index)}
                    onClick={command.run}
                    className={cn("cmdk-item", index === cursor && "cmdk-item-active")}
                  >
                    <Icon size={15} className="cmdk-item-icon" />
                    <span className="cmdk-item-label">{command.label}</span>
                    <span className="cmdk-item-hint">{command.hint}</span>
                    {index === cursor ? <CornerDownLeft size={13} className="cmdk-item-enter" /> : null}
                  </button>
                </div>
              );
            })
          ) : (
            <p className="cmdk-empty">No command matches that.</p>
          )}
        </div>

        <div className="cmdk-footer">
          <span>
            <kbd className="cmdk-kbd">↑</kbd>
            <kbd className="cmdk-kbd">↓</kbd> to move
          </span>
          <span>
            <kbd className="cmdk-kbd">↵</kbd> to run
          </span>
          <span className="ml-auto">
            <kbd className="cmdk-kbd">⌘</kbd>
            <kbd className="cmdk-kbd">K</kbd> anywhere
          </span>
        </div>
      </div>
    </div>
  );
}

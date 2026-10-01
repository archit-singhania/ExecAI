"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Compass,
  FileText,
  Layers3,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { BoardWorkflows, ScenarioComparison, MetricHistory, WorkspaceNotifications } from "@/components/studio/workflows";
import { Dialog } from "@/components/ui/dialog";
import { Logo } from "@/components/logo";
import { useTheme } from "@/components/theme-provider";
import { api, AgentReport, ChatMessage } from "@/lib/api";
import { clearSession, getStoredUser, getToken, isDemoSession } from "@/lib/auth";
import { jobsApi, JobState } from "@/lib/jobs";
import {
  API_BASE,
  studioRequest,
  StudioRecord,
  StudioTask,
  Workspace,
} from "@/lib/studio";
import { TrackRecord } from "@/components/sections/track-record";
import { Analytics } from "@/components/sections/analytics";
import { ReviewCadenceCard } from "@/components/dashboard/review-cadence-card";

const NAV = [
  { id: "overview", name: "Overview", icon: Compass },
  { id: "boardroom", name: "Boardroom", icon: MessageSquare },
  { id: "decisions", name: "Decisions", icon: Layers3 },
  { id: "execution", name: "Execution", icon: Check },
  { id: "knowledge", name: "Knowledge", icon: BookOpen },
  { id: "finance", name: "Scenario lab", icon: Wallet },
  { id: "goals", name: "Goals & metrics", icon: Target },
  { id: "forecasts", name: "Forecasts", icon: Activity },
  { id: "reports", name: "Reports & reviews", icon: FileText },
  { id: "analytics", name: "Analytics", icon: BriefcaseBusiness },
  { id: "team", name: "Team & activity", icon: Users },
  { id: "controls", name: "Agent controls", icon: Settings2 },
  { id: "security", name: "Trust center", icon: ShieldCheck },
];
type Member = { id: string; name: string; email: string; role: string };
type Citation = {
  id: string;
  document_id: string;
  position: number;
  content: string;
  score: number;
};
type SecuritySession = {
  id: string;
  label: string;
  created_at: string;
  expires_at: string;
  revoked: boolean;
};
type ProviderStatus = {
  name: string;
  model?: string;
  available?: boolean;
  served?: number;
  cooling_down?: boolean;
};

function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="st-empty">
      <Sparkles size={28} />
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="st-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function dated(value?: string) {
  return value
    ? new Date(value).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
}
function text(value: unknown) {
  return value === undefined || value === null ? "" : String(value);
}

export function ExecutiveStudio() {
  const pathname = usePathname();
  const route = pathname.split("/")[2] || "overview";
  const section = NAV.some((n) => n.id === route) ? route : "overview";
  const title = NAV.find((n) => n.id === section)?.name ?? "Overview";
  const { appearance, setAppearance } = useTheme();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selected, setSelected] = useState("");
  const [records, setRecords] = useState<StudioRecord[]>([]);
  const [tasks, setTasks] = useState<StudioTask[]>([]);
  const [reports, setReports] = useState<AgentReport[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<SecuritySession[]>([]);
  const [job, setJob] = useState<JobState | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [booting, setBooting] = useState(true);
  const [menu, setMenu] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StudioRecord[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [provider, setProvider] = useState<Record<string, unknown> | null>(null);
  const [editing, setEditing] = useState<StudioRecord | null>(null);
  const [editingTask, setEditingTask] = useState<StudioTask | null>(null);
  const [reportPreview, setReportPreview] = useState<AgentReport | null>(null);
  const [online, setOnline] = useState(true);
  const [installPrompt, setInstallPrompt] = useState<
    (Event & { prompt: () => Promise<void> }) | null
  >(null);
  const mounted = useRef(true);
  const selection = useRef(selected);
  selection.current = selected;
  const user = getStoredUser();
  const workspace = workspaces.find((w) => w.id === selected);
  const role = members.find((m) => m.id === user?.id)?.role;
  const writable = workspace?.owned || role === "editor";
  const scoped = (path: string) => `/api/studio/${selected}${path}`;

  const refresh = useCallback(async (id: string) => {
    const [nextRecords, nextTasks, nextReports, nextMessages, nextMembers] =
      await Promise.all([
        studioRequest<StudioRecord[]>(`/api/studio/${id}/records`),
        studioRequest<StudioTask[]>(`/api/studio/${id}/tasks`),
        api.getReports(id),
        api.getMessages(id),
        studioRequest<Member[]>(`/api/studio/${id}/members`),
      ]);
    if (!mounted.current || selection.current !== id) return;
    setRecords(nextRecords);
    setTasks(nextTasks);
    setReports(nextReports);
    setMessages(nextMessages);
    setMembers(nextMembers);
    // Session-only cache: cleared on logout; never store credentials or uploaded documents.
    window.sessionStorage.setItem(
      `ceoai-offline-${id}`,
      JSON.stringify({
        tasks: nextTasks,
        reports: nextReports,
        messages: nextMessages,
      }),
    );
  }, []);

  useEffect(() => {
    mounted.current = true;
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(navigator.onLine);
    const handleInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as Event & { prompt: () => Promise<void> });
    };
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen((s) => !s);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMenu(false);
        setReportPreview(null);
      }
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOnline);
    window.addEventListener("beforeinstallprompt", handleInstall);
    window.addEventListener("keydown", handleKey);
    if ("serviceWorker" in navigator)
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    if (isDemoSession()) {
      setBooting(false);
      return () => {
        mounted.current = false;
        window.removeEventListener("keydown", handleKey);
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOnline);
        window.removeEventListener("beforeinstallprompt", handleInstall);
      };
    }
    studioRequest<Workspace[]>("/api/studio/workspaces")
      .then((items) => {
        setWorkspaces(items);
        const stored = window.sessionStorage.getItem("ceoai-workspace");
        setSelected(
          items.find((w) => w.id === stored && !w.archived)?.id ??
            items.find((w) => !w.archived)?.id ??
            "",
        );
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setBooting(false));
    return () => {
      mounted.current = false;
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOnline);
      window.removeEventListener("beforeinstallprompt", handleInstall);
    };
  }, []);

  useEffect(() => {
    if (!selected) return;
    window.sessionStorage.setItem("ceoai-workspace", selected);
    setRecords([]); setTasks([]); setReports([]); setMessages([]); setMembers([]);
    setEditing(null);
    setEditingTask(null);
    setJob(null);
    setError("");
    refresh(selected).catch((e: Error) => {
      setError(e.message);
      const cached = window.sessionStorage.getItem(`ceoai-offline-${selected}`);
      if (!navigator.onLine && cached) {
        const data = JSON.parse(cached);
        setTasks(data.tasks);
        setReports(data.reports);
        setMessages(data.messages);
        setNotice("Showing your previously viewed work. Changes require a connection.");
      }
    });
  }, [selected, refresh]);

  useEffect(() => {
    if (!selected) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const runs = await studioRequest<JobState[]>("/api/jobs");
        const current =
          runs.find(
            (r) => r.id === window.sessionStorage.getItem(`ceoai-run-${selected}`),
          ) ??
          runs.find(
            (r) =>
              r.session_id === selected &&
              (r.status === "queued" || r.status === "running"),
          );
        if (!active || !current) return;
        setJob(current);
        if (current.status === "done") {
          window.sessionStorage.removeItem(`ceoai-run-${selected}`);
          await refresh(selected);
        } else if (current.status === "queued" || current.status === "running")
          timer = setTimeout(poll, 1200);
      } catch (e) {
        if (active)
          setError(e instanceof Error ? e.message : "Unable to reconnect to this run.");
      }
    };
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [selected, refresh]);

  useEffect(() => {
    if (section === "security")
      studioRequest<SecuritySession[]>("/api/studio/security/sessions")
        .then(setSessions)
        .catch((e: Error) => setError(e.message));
    if (section === "controls" || section === "boardroom")
      studioRequest<Record<string, unknown>>("/api/llm/status")
        .then(setProvider)
        .catch(() => undefined);
  }, [section]);

  async function action(work: () => Promise<void>) {
    if (!online) {
      setError("Reconnect to make changes. Your viewed work is available below.");
      return;
    }
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to complete this action.");
    } finally {
      setBusy(false);
    }
  }
  async function saveRecord(event: React.FormEvent<HTMLFormElement>, kind: string) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const payload: {
      kind: string;
      title: string;
      body: string;
      data: Record<string, unknown>;
      version?: number;
    } = {
      kind,
      title: text(values.get("title")),
      body: text(values.get("body")),
      data: {},
    };
    for (const [key, value] of values.entries())
      if (key !== "title" && key !== "body")
        payload.data[key] =
          kind === "scenario" ||
          (kind === "metric" && ["value", "target"].includes(key))
            ? Number(value)
            : value;
    if (editing) payload.version = editing.version;
    await action(async () => {
      await studioRequest(
        scoped(`/records${editing ? `/${editing.id}` : ""}`),
        editing ? "PUT" : "POST",
        payload,
      );
      setEditing(null);
      form.reset();
      await refresh(selected);
      setNotice("Saved to your workspace.");
    });
  }
  async function removeRecord(record: StudioRecord) {
    await action(async () => {
      await studioRequest(scoped(`/records/${record.id}`), "DELETE");
      await refresh(selected);
    });
  }
  async function startRun(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const challenge = text(values.get("challenge"));
    const content = `${challenge ? `Challenge ${challenge}: ` : ""}${text(values.get("prompt"))}`;
    await action(async () => {
      const started = await jobsApi.startBoardRun(selected, content);
      window.sessionStorage.setItem(`ceoai-run-${selected}`, started.job_id);
      form.reset();
      const tick = async () => {
        if (!mounted.current || selection.current !== selected) return;
        try {
          const state = await jobsApi.get(started.job_id);
          if (selection.current !== selected) return;
          setJob(state);
          if (state.status === "done") {
            window.sessionStorage.removeItem(`ceoai-run-${selected}`);
            await refresh(selected);
          } else if (state.status === "failed" || state.status === "cancelled")
            setError(state.error || "Run cancelled.");
          else window.setTimeout(tick, 1200);
        } catch (e) {
          setError(
            e instanceof Error
              ? e.message
              : "Connection interrupted. Your run continues; reopen this workspace to reconnect.",
          );
        }
      };
      await tick();
    });
  }
  async function saveTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const payload = {
      title: text(values.get("title")),
      description: text(values.get("description")),
      status: text(values.get("status")),
      priority: text(values.get("priority")),
      due_at: values.get("due_at") || null,
      assignee_id: values.get("assignee_id") || null,
      dependencies: values.getAll("dependencies"),
    };
    await action(async () => {
      await studioRequest(
        scoped(`/tasks${editingTask ? `/${editingTask.id}` : ""}`),
        editingTask ? "PUT" : "POST",
        payload,
      );
      setEditingTask(null);
      form.reset();
      await refresh(selected);
      setNotice("Task saved.");
    });
  }
  async function downloadReport(report: AgentReport, format: "pdf" | "md") {
    await action(async () => {
      let blob: Blob;
      if (format === "md") {
        const result = await api.exportReport(report.id!);
        blob = new Blob([result.markdown], { type: "text/markdown" });
      } else {
        const token = getToken();
        const response = await fetch(
          `${API_BASE}${scoped(`/reports/${report.id}/pdf`)}`,
          {
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );
        if (!response.ok) {
          const failure = await response.json();
          throw new Error(failure.detail || "Export failed.");
        }
        blob = await response.blob();
      }
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `ceoai-report-${report.id}.${format}`;
      link.click();
      URL.revokeObjectURL(link.href);
    });
  }
  const recordKind =
    section === "decisions"
      ? "decision"
      : section === "finance"
        ? "scenario"
        : section === "goals"
          ? "metric"
          : section === "team"
            ? "comment"
            : "profile";
  const currentRecords = records.filter((r) => r.kind === recordKind);
  const running = job?.status === "running" || job?.status === "queued";
  const done = tasks.filter((t) => t.status.toLowerCase() === "done").length;
  const revisionCount = records.filter((r) => r.kind === "decision_revision").length;

  if (isDemoSession())
    return (
      <main className="st-demo">
        <Logo size={56} />
        <h1>Explore the executive workspace</h1>
        <p>
          The studio saves real company data. Your interactive boardroom demo is
          available without an account.
        </p>
        <Link href="/dashboard" className="st-primary">
          Open the labeled demo
        </Link>
        <Link href="/signup" className="st-secondary">
          Create your workspace
        </Link>
      </main>
    );
  return (
    <div className="st-app">
      <aside className={`st-sidebar ${menu ? "is-open" : ""}`}>
        <Link href="/" className="st-brand">
          <Logo size={40} />
          <span>
            CEO.ai<small>Executive studio</small>
          </span>
        </Link>
        <div className="st-workspace">
          <span className="st-eyebrow">YOUR COMPANY</span>
          <select
            aria-label="Choose workspace"
            value={selected}
            onChange={(e) => {
              setSelected(e.target.value);
              setMenu(false);
            }}
          >
            {!workspaces.some((w) => !w.archived) && (
              <option value="">Choose a workspace</option>
            )}
            {workspaces
              .filter((w) => !w.archived)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.title}
                </option>
              ))}
          </select>
          <button
            className="st-icon"
            aria-label="New workspace"
            onClick={() => setShowNew(true)}
          >
            <Plus size={16} />
          </button>
        </div>
        <nav aria-label="Studio sections">
          {NAV.map(({ id, name, icon: Icon }) => (
            <Link
              key={id}
              href={id === "overview" ? "/studio" : `/studio/${id}`}
              aria-current={section === id ? "page" : undefined}
              onClick={() => setMenu(false)}
            >
              <Icon size={18} />
              <span>{name}</span>
              {section === id && <span className="st-nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="st-sidebar-bottom">
          <Link href="/dashboard">
            Classic boardroom <ArrowRight size={15} />
          </Link>
          <Link href="/settings">
            Account & billing <ArrowRight size={15} />
          </Link>
          <div className="st-user">
            <span>{user?.name?.slice(0, 1) || "C"}</span>
            <div>
              {user?.name || "Your account"}
              <small>{user?.email}</small>
            </div>
            <button
              aria-label="Sign out"
              className="st-icon"
              onClick={() => {
                clearSession();
                window.sessionStorage.clear();
                window.location.href = "/login";
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      {menu && (
        <button
          className="st-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="st-main">
        <header className="st-topbar">
          <div>
            <button
              className="st-icon st-menu"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu size={20} />
            </button>
            <span className="st-breadcrumb">
              Workspace <ChevronDown size={12} /> <strong>{title}</strong>
            </span>
          </div>
          <div className="st-top-actions">
            <button className="st-search-button" onClick={() => setSearchOpen(true)}>
              <Search size={16} />
              <span>Search everything</span>
              <kbd>⌘ K</kbd>
            </button>
            <select
              aria-label="Appearance"
              value={appearance}
              onChange={(e) =>
                setAppearance(e.target.value as "system" | "light" | "dark")
              }
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
            {installPrompt && (
              <button
                className="st-secondary"
                onClick={() => void installPrompt.prompt()}
              >
                Install app
              </button>
            )}
          </div>
        </header>
        <main id="main" className="st-content">
          <div className="st-page-heading">
            <div>
              <span className="st-eyebrow">A CLEARER WAY TO LEAD</span>
              <h1>{title}</h1>
              <p>
                {section === "overview"
                  ? "Your decisions, evidence, and next moves. In one considered space."
                  : workspace?.title || "Select a workspace to begin."}
              </p>
            </div>
            <span className="st-status">
              <span className={online ? "st-live-dot" : "st-offline-dot"} />
              {online ? "Workspace connected" : "Offline · reading mode"}
            </span>
          </div>
          {error && (
            <div className="st-alert" role="alert">
              {error}
              <button
                className="st-icon"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div className="st-notice" role="status">
              {notice}
            </div>
          )}
          {booting && (
            <div className="st-loading">
              <Loader2 className="animate-spin" />
              Connecting to your workspace…
            </div>
          )}
          {(showNew || (!selected && !booting)) && (
            <section className="st-card st-onboarding">
              <span className="st-eyebrow">BEGIN WITH CONTEXT</span>
              <h2>Create a company workspace</h2>
              <p>
                Describe the company and decision you are working on. The board uses
                this context in every run.
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = event.currentTarget;
                  const data = new FormData(form);
                  void action(async () => {
                    const created = await api.createSession(text(data.get("goal")));
                    await studioRequest(
                      `/api/studio/workspaces/${created.id}`,
                      "PATCH",
                      { title: text(data.get("name")) },
                    );
                    const items = await studioRequest<Workspace[]>(
                      "/api/studio/workspaces",
                    );
                    setWorkspaces(items);
                    setSelected(created.id);
                    setShowNew(false);
                  });
                }}
              >
                <Field label="Company name">
                  <input
                    name="name"
                    required
                    maxLength={180}
                    placeholder="Your company"
                  />
                </Field>
                <Field label="Business goal & context">
                  <textarea
                    name="goal"
                    required
                    minLength={5}
                    maxLength={5000}
                    placeholder="What are you building, for whom, and what needs a decision?"
                    rows={4}
                  />
                </Field>
                <button className="st-primary" disabled={busy}>
                  Create workspace <ArrowRight size={16} />
                </button>
                {selected && (
                  <button
                    type="button"
                    className="st-secondary"
                    onClick={() => setShowNew(false)}
                  >
                    Cancel
                  </button>
                )}
              </form>
              {workspaces
                .filter((w) => w.archived)
                .map((w) => (
                  <button
                    className="st-secondary"
                    key={w.id}
                    onClick={() =>
                      void action(async () => {
                        const archive = await studioRequest<StudioRecord[]>(
                          `/api/studio/${w.id}/records?kind=archive`,
                        );
                        for (const r of archive)
                          await studioRequest(
                            `/api/studio/${w.id}/records/${r.id}`,
                            "DELETE",
                          );
                        setWorkspaces(await studioRequest("/api/studio/workspaces"));
                        setSelected(w.id);
                        setShowNew(false);
                      })
                    }
                  >
                    Restore {w.title}
                  </button>
                ))}
            </section>
          )}
          {selected && !showNew && (
            <>
              {!writable && (
                <div className="st-notice">You have read access to this workspace.</div>
              )}
              {section === "overview" && (
                <>
                  <section className="st-hero">
                    <div>
                      <span className="st-eyebrow">YOUR EXECUTIVE DESK</span>
                      <h2>
                        Turn a question into
                        <br />a considered decision.
                      </h2>
                      <p>{workspace?.business_goal}</p>
                      <Link href="/studio/boardroom" className="st-primary">
                        Convene your board <ArrowRight size={17} />
                      </Link>
                    </div>
                    <div className="st-hero-orbit" aria-hidden="true">
                      <div />
                      <Compass size={76} />
                      <span>
                        9 perspectives.
                        <br />
                        One clear next move.
                      </span>
                    </div>
                  </section>
                  <div className="st-metrics">
                    {[
                      {
                        label: "Reports filed",
                        value: reports.length,
                        detail: "Persisted board intelligence",
                      },
                      {
                        label: "Decisions recorded",
                        value: records.filter((r) => r.kind === "decision").length,
                        detail: `${revisionCount} previous versions`,
                      },
                      {
                        label: "Tasks completed",
                        value: `${done}/${tasks.length}`,
                        detail: "Your execution progress",
                      },
                      {
                        label: "Evidence documents",
                        value: records.filter(
                          (r) => r.kind === "knowledge" || r.kind === "research",
                        ).length,
                        detail: "Knowledge behind your choices",
                      },
                    ].map((m) => (
                      <section className="st-card" key={m.label}>
                        <span className="st-eyebrow">{m.label}</span>
                        <strong className="st-metric-number">{m.value}</strong>
                        <p>{m.detail}</p>
                      </section>
                    ))}
                  </div>
                  <div className="st-two-col">
                    <section className="st-card">
                      <div className="st-section-head">
                        <h2>Next moves</h2>
                        <Link href="/studio/execution">
                          View all <ArrowRight size={14} />
                        </Link>
                      </div>
                      {tasks
                        .filter((t) => t.status !== "Done")
                        .slice(0, 5)
                        .map((t) => (
                          <div className="st-compact-row" key={t.id}>
                            <span className={`st-priority ${t.priority.toLowerCase()}`}>
                              {t.priority}
                            </span>
                            <div>
                              <strong>{t.title}</strong>
                              <small>
                                {t.due_at ? `Due ${dated(t.due_at)}` : "No due date"}
                              </small>
                            </div>
                          </div>
                        ))}
                      {!tasks.length && (
                        <Empty
                          title="A clean execution slate"
                          detail="Create a task or run your board to generate next moves."
                        />
                      )}
                    </section>
                    <section className="st-card">
                      <div className="st-section-head">
                        <h2>Company context</h2>
                        <Link href="/studio/controls">
                          Agent controls <ArrowRight size={14} />
                        </Link>
                      </div>
                      <p>{workspace?.business_goal}</p>
                      {records
                        .filter((r) => r.kind === "profile")
                        .map((r) => (
                          <div key={r.id}>
                            <h3>{r.title}</h3>
                            <p className="st-prose">{r.body}</p>
                          </div>
                        ))}
                      <button
                        className="st-secondary"
                        onClick={() =>
                          setEditing(records.find((r) => r.kind === "profile") || null)
                        }
                      >
                        Edit context below
                      </button>
                    </section>
                  </div>
                  <section className="st-card">
                    <h2>{editing ? "Edit company context" : "Add company context"}</h2>
                    <form
                      key={editing?.id || "profile"}
                      onSubmit={(e) => void saveRecord(e, "profile")}
                    >
                      <Field label="Company / profile title">
                        <input
                          name="title"
                          defaultValue={editing?.title}
                          required
                          maxLength={240}
                        />
                      </Field>
                      <Field label="Market, stage, constraints, budget and baseline KPIs">
                        <textarea name="body" defaultValue={editing?.body} rows={4} />
                      </Field>
                      <div className="st-form-grid">{["industry", "stage", "target_customer", "budget", "constraints", "baseline_kpis"].map(key => <Field key={key} label={key.replaceAll("_", " ")}><input name={key} defaultValue={text(editing?.data[key])}/></Field>)}</div>
                      <button className="st-primary" disabled={busy || !writable}>
                        Save context
                      </button>
                    </form>
                  </section>
                </>
              )}
              {section === "team" && <WorkspaceNotifications id={selected}/>}
              {section === "finance" && <ScenarioComparison records={records}/>}
              {section === "goals" && <MetricHistory records={records}/>}
              {section === "boardroom" && (
                <>
                  <section className="st-card">
                    <div className="st-section-head">
                      <div>
                        <span className="st-eyebrow">
                          NINE SPECIALISTS · LIVE PROGRESS
                        </span>
                        <h2>A board that challenges your assumptions</h2>
                      </div>
                      <span className="st-chip">
                        {running
                          ? `${job?.progress_current}/9 reported`
                          : "Ready when you are"}
                      </span>
                    </div>
                    <p>
                      Reports identify model responses and local planning templates.
                      Verify evidence before committing to a decision.
                    </p>
                    <form onSubmit={(e) => void startRun(e)}>
                      <Field label="What should the board weigh in on?">
                        <textarea
                          name="prompt"
                          required
                          maxLength={8000}
                          rows={4}
                          placeholder="Compare two options, challenge a plan, or ask what to do next."
                        />
                      </Field>
                      <Field label="Focus the discussion">
                        <select name="challenge">
                          <option value="">Full board assessment</option>
                          {[
                            "Market Research",
                            "CFO",
                            "CTO",
                            "Product Manager",
                            "Marketing",
                            "Legal",
                            "Sales",
                            "Designer",
                            "Executive Assistant",
                          ].map((agent) => (
                            <option key={agent}>{agent}</option>
                          ))}
                        </select>
                      </Field>
                      <div className="st-form-actions">
                        <button
                          className="st-primary"
                          disabled={busy || running || !writable}
                        >
                          {busy || running ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Sparkles size={16} />
                          )}
                          Convene board
                        </button>

                        {running && (
                          <button
                            type="button"
                            className="st-secondary"
                            onClick={() =>
                              void action(async () => {
                                setJob(
                                  await studioRequest(
                                    `/api/jobs/${job!.id}/cancel`,
                                    "POST",
                                  ),
                                );
                              })
                            }
                          >
                            Cancel run
                          </button>
                        )}
                        {job &&
                          (job.status === "failed" || job.status === "cancelled") && (
                            <button
                              type="button"
                              className="st-secondary"
                              onClick={() =>
                                void action(async () => {
                                  const run = await studioRequest<{ job_id: string }>(
                                    `/api/jobs/${job.id}/retry`,
                                    "POST",
                                  );
                                  window.sessionStorage.setItem(
                                    `ceoai-run-${selected}`,
                                    run.job_id,
                                  );
                                  window.location.reload();
                                })
                              }
                            >
                              Retry
                            </button>
                          )}
                      </div>
                    </form>
                    {job && (
                      <div
                        className="st-progress"
                        role="progressbar"
                        aria-valuenow={job.progress_current}
                        aria-valuemin={0}
                        aria-valuemax={9}
                      >
                        <span
                          style={{ width: `${(job.progress_current / 9) * 100}%` }}
                        />
                      </div>
                    )}
                  </section>
                  {!!job?.reports.length && (
                    <div className="st-report-grid">
                      {job.reports.map((r) => (
                        <section className="st-card" key={r.agent}>
                          <span className="st-eyebrow">{r.agent}</span>
                          <div className="st-report-score">
                            {r.score}
                            <small>/100</small>
                          </div>
                          <h3>{r.title}</h3>
                          <p>{r.summary}</p>
                          <span className="st-chip">
                            {text((r as AgentReport & { source?: string }).source) ||
                              "Persisted report"}
                          </span>
                        </section>
                      ))}
                    </div>
                  )}
                  <BoardWorkflows id={selected} records={records} writable={!!writable} refresh={() => refresh(selected)} action={action} job={job} onJob={setJob}/>
                  <section className="st-card">
                    <h2>Conversation</h2>
                    {messages.length ? (
                      messages.map((m) => (
                        <article className={`st-message ${m.role}`} key={m.id}>
                          <span className="st-eyebrow">
                            {m.role === "user" ? "You" : "CEO synthesis"} ·{" "}
                            {dated(m.created_at)}
                          </span>
                          <p className="st-prose">{m.content}</p>
                          {m.role === "assistant" && (
                            <button
                              className="st-secondary"
                              onClick={() => {
                                setEditing(null);
                                void action(async () => {
                                  await studioRequest(scoped("/records"), "POST", {
                                    kind: "decision",
                                    title: m.content.slice(0, 90) || "Board decision",
                                    body: m.content,
                                    data: {
                                      message_id: m.id,
                                      assumptions: "Review before accepting",
                                      status: "draft",
                                    },
                                  });
                                  await refresh(selected);
                                  setNotice(
                                    "Saved as a draft decision. Review it in Decisions.",
                                  );
                                });
                              }}
                            >
                              Save draft decision
                            </button>
                          )}
                        </article>
                      ))
                    ) : (
                      <Empty
                        title="Your board has not met yet"
                        detail="Submit your first question to build a persistent conversation and decision trail."
                      />
                    )}
                  </section>
                </>
              )}
              {["decisions", "finance", "goals"].includes(section) && (
                <>
                  <section className="st-card">
                    <h2>
                      {editing ? "Edit " : "New "}
                      {section === "decisions"
                        ? "decision"
                        : section === "finance"
                          ? "financial scenario"
                          : "goal or metric"}
                    </h2>
                    <form
                      key={editing?.id || recordKind}
                      onSubmit={(e) => void saveRecord(e, recordKind)}
                    >
                      <Field label="Title">
                        <input
                          name="title"
                          required
                          maxLength={240}
                          defaultValue={editing?.title}
                        />
                      </Field>
                      <Field
                        label={
                          section === "decisions"
                            ? "Decision rationale"
                            : "Notes & assumptions"
                        }
                      >
                        <textarea name="body" rows={3} defaultValue={editing?.body} />
                      </Field>
                      {section === "decisions" && (
                        <div className="st-form-grid">
                          {["alternatives", "assumptions", "owner", "review_date"].map(
                            (k) => (
                              <Field key={k} label={k.replaceAll("_", " ")}>
                                <input
                                  name={k}
                                  type={k === "review_date" ? "date" : "text"}
                                  defaultValue={text(editing?.data[k])}
                                />
                              </Field>
                            ),
                          )}
                        </div>
                      )}
                      {section === "finance" && (
                        <div className="st-form-grid">
                          {[
                            { key: "cash", label: "Available cash", value: 0 },
                            { key: "monthly_cost", label: "Monthly costs", value: 0 },
                            {
                              key: "monthly_revenue",
                              label: "Monthly revenue",
                              value: 0,
                            },
                            {
                              key: "ad_spend",
                              label: "Monthly acquisition spend",
                              value: 0,
                            },
                            {
                              key: "customers",
                              label: "New customers per month",
                              value: 0,
                            },
                            {
                              key: "arpu",
                              label: "Monthly revenue per customer",
                              value: 0,
                            },
                            { key: "margin", label: "Gross margin (0–1)", value: 0.7 },
                            { key: "churn", label: "Monthly churn (0–1)", value: 0.05 },
                          ].map((f) => (
                            <Field label={f.label} key={f.key}>
                              <input
                                name={f.key}
                                type="number"
                                min="0"
                                max={
                                  f.key === "margin" || f.key === "churn"
                                    ? 1
                                    : undefined
                                }
                                step="any"
                                required
                                defaultValue={text(editing?.data[f.key] ?? f.value)}
                              />
                            </Field>
                          ))}
                        </div>
                      )}
                      {section === "goals" && (
                        <div className="st-form-grid"><Field label="Objective"><input name="objective" defaultValue={text(editing?.data.objective)} placeholder="The larger goal this key result supports"/></Field><Field label="Metric owner"><input name="owner" defaultValue={text(editing?.data.owner)}/></Field><Field label="Review date"><input name="review_date" type="date" defaultValue={text(editing?.data.review_date)}/></Field>
                          <Field label="Current value">
                            <input
                              name="value"
                              type="number"
                              step="any"
                              required
                              defaultValue={text(editing?.data.value ?? 0)}
                            />
                          </Field>
                          <Field label="Target">
                            <input
                              name="target"
                              type="number"
                              step="any"
                              required
                              defaultValue={text(editing?.data.target ?? 0)}
                            />
                          </Field>
                        </div>
                      )}
                      <div className="st-form-actions">
                        <button className="st-primary" disabled={busy || !writable}>
                          Save {recordKind}
                        </button>
                        {editing && (
                          <button
                            type="button"
                            className="st-secondary"
                            onClick={() => setEditing(null)}
                          >
                            Cancel edit
                          </button>
                        )}
                      </div>
                    </form>
                  </section>
                  <div className="st-two-col">
                    {currentRecords.map((r) => (
                      <article className="st-card" key={r.id}>
                        <span className="st-eyebrow">
                          {recordKind} · Version {r.version} · {dated(r.updated_at)}
                        </span>
                        <h2>{r.title}</h2>
                        <p className="st-prose">{r.body}</p>
                        {section === "decisions" && (
                          <dl className="st-definition">
                            {Object.entries(r.data).map(([k, v]) => (
                              <div key={k}>
                                <dt>{k.replaceAll("_", " ")}</dt>
                                <dd>{text(v)}</dd>
                              </div>
                            ))}
                          </dl>
                        )}
                        {section === "finance" && (
                          <dl className="st-definition">
                            {Object.entries(
                              (r.data.result || {}) as Record<string, unknown>,
                            ).map(([k, v]) => (
                              <div key={k}>
                                <dt>{k.replaceAll("_", " ")}</dt>
                                <dd>
                                  {v === null
                                    ? "Not defined by these inputs"
                                    : typeof v === "number"
                                      ? v.toLocaleString(undefined, {
                                          maximumFractionDigits: 2,
                                        })
                                      : text(v)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        )}
                        {section === "goals" && (
                          <>
                            <div className="st-report-score">
                              {text(r.data.value)}
                              <small> / {text(r.data.target)}</small>
                            </div>
                            <progress
                              value={Math.min(
                                Number(r.data.value),
                                Number(r.data.target),
                              )}
                              max={Math.max(1, Number(r.data.target))}
                            />
                          </>
                        )}
                        <div className="st-form-actions">
                          <button
                            className="st-secondary"
                            disabled={!writable}
                            onClick={() => {
                              setEditing(r);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="st-text-danger"
                            disabled={!writable}
                            onClick={() => void removeRecord(r)}
                          >
                            Delete
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!currentRecords.length && (
                    <Empty
                      title="Start with one meaningful record"
                      detail="Your records are saved to this workspace and become part of its operating history."
                    />
                  )}
                  {section === "decisions" &&
                    records.some((r) => r.kind === "decision_revision") && (
                      <section className="st-card">
                        <h2>Previous decision versions</h2>
                        {records
                          .filter((r) => r.kind === "decision_revision")
                          .map((r) => (
                            <details key={r.id}>
                              <summary>
                                {r.title} · Version {text(r.data.version)}
                              </summary>
                              <p className="st-prose">{r.body}</p>
                            </details>
                          ))}
                      </section>
                    )}
                </>
              )}
              {section === "execution" && (
                <>
                  <section className="st-card">
                    <h2>{editingTask ? "Edit task" : "Add an action"}</h2>
                    <form
                      key={editingTask?.id || "task"}
                      onSubmit={(e) => void saveTask(e)}
                    >
                      <Field label="Task title">
                        <input
                          name="title"
                          required
                          maxLength={220}
                          defaultValue={editingTask?.title}
                        />
                      </Field>
                      <Field label="Details">
                        <textarea
                          name="description"
                          rows={2}
                          defaultValue={editingTask?.description}
                        />
                      </Field>
                      <div className="st-form-grid">
                        <Field label="Status">
                          <select
                            name="status"
                            defaultValue={editingTask?.status || "Ready"}
                          >
                            {["Ready", "In progress", "Done"].map((v) => (
                              <option key={v}>{v}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Priority">
                          <select
                            name="priority"
                            defaultValue={editingTask?.priority || "Medium"}
                          >
                            {["High", "Medium", "Low"].map((v) => (
                              <option key={v}>{v}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Due date">
                          <input
                            name="due_at"
                            type="date"
                            defaultValue={editingTask?.due_at || ""}
                          />
                        </Field>
                        <Field label="Assignee">
                          <select
                            name="assignee_id"
                            defaultValue={editingTask?.assignee_id || ""}
                          >
                            <option value="">Unassigned</option>
                            {members.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Dependencies (select multiple)">
                          <select
                            name="dependencies"
                            multiple
                            defaultValue={editingTask?.dependencies || []}
                          >
                            {tasks
                              .filter((t) => t.id !== editingTask?.id)
                              .map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.title}
                                </option>
                              ))}
                          </select>
                        </Field>
                      </div>
                      <div className="st-form-actions">
                        <button className="st-primary" disabled={busy || !writable}>
                          Save task
                        </button>
                        {editingTask && (
                          <button
                            type="button"
                            className="st-secondary"
                            onClick={() => setEditingTask(null)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </form>
                  </section>
                  <div className="st-kanban">
                    {["Ready", "In progress", "Done"].map((status) => (
                      <section className="st-kanban-column" key={status}>
                        <div className="st-section-head">
                          <h2>{status}</h2>
                          <span className="st-chip">
                            {
                              tasks.filter(
                                (t) =>
                                  t.status === status ||
                                  (status === "Ready" &&
                                    !["Done", "In progress"].includes(t.status)),
                              ).length
                            }
                          </span>
                        </div>
                        {tasks
                          .filter(
                            (t) =>
                              t.status === status ||
                              (status === "Ready" &&
                                !["Done", "In progress"].includes(t.status)),
                          )
                          .map((t) => (
                            <article className="st-card st-task" key={t.id}>
                              <span
                                className={`st-priority ${t.priority.toLowerCase()}`}
                              >
                                {t.priority}
                              </span>
                              <h3>{t.title}</h3>
                              <p>{t.description}</p>
                              <small>
                                {t.due_at ? `Due ${dated(t.due_at)}` : "No due date"}
                              </small>
                              {!!t.dependencies?.length && (
                                <small>{t.dependencies.length} dependency tasks</small>
                              )}
                              <button
                                className="st-secondary"
                                disabled={!writable}
                                onClick={() => setEditingTask(t)}
                              >
                                Edit task
                              </button>
                            </article>
                          ))}
                      </section>
                    ))}
                  </div>
                </>
              )}
              {section === "knowledge" && (
                <>
                  <div className="st-two-col">
                    <section className="st-card">
                      <h2>Add company knowledge</h2>
                      <p>
                        Searchable PDF, Markdown, plain text or CSV. Files stay in this
                        workspace; 10 MB maximum.
                      </p>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const values = new FormData(form);
                          void action(async () => {
                            await studioRequest(scoped("/knowledge"), "POST", values);
                            form.reset();
                            await refresh(selected);
                            setNotice("Document extracted and indexed.");
                          });
                        }}
                      >
                        <Field label="Choose document">
                          <input
                            type="file"
                            name="file"
                            required
                            accept=".pdf,.txt,.md,.csv"
                          />
                        </Field>
                        <button className="st-primary" disabled={busy || !writable}>
                          Upload & index
                        </button>
                      </form>
                    </section>
                    <section className="st-card">
                      <h2>Find evidence</h2>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const q = text(new FormData(e.currentTarget).get("q"));
                          void action(async () => {
                            const value = await studioRequest<{ results: Citation[] }>(
                              scoped(`/knowledge/search?q=${encodeURIComponent(q)}`),
                            );
                            setCitations(value.results);
                            if (!value.results.length)
                              setNotice("No matching document passages found.");
                          });
                        }}
                      >
                        <Field label="Search your documents">
                          <input
                            name="q"
                            required
                            minLength={2}
                            placeholder="Customer needs, pricing, or constraints"
                          />
                        </Field>
                        <button className="st-secondary">Search knowledge</button>
                      </form>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const query = text(
                            new FormData(e.currentTarget).get("query"),
                          );
                          void action(async () => {
                            await studioRequest(scoped("/research"), "POST", { query });
                            await refresh(selected);
                            setNotice(
                              "Sources saved. Inspect the original pages before using their claims.",
                            );
                          });
                        }}
                      >
                        <Field label="External research (configured Tavily provider)">
                          <input
                            name="query"
                            required
                            minLength={3}
                            placeholder="Research a market or competitor"
                          />
                        </Field>
                        <button className="st-secondary" disabled={!writable || busy}>
                          Research sources
                        </button>
                      </form>
                    </section>
                  </div>
                  {citations.map((c) => (
                    <section className="st-card" key={c.id}>
                      <span className="st-eyebrow">
                        {records.find((r) => r.id === c.document_id)?.title ||
                          "Document"}{" "}
                        · Passage {c.position + 1} · Relevance{" "}
                        {Math.round(c.score * 100)}%
                      </span>
                      <p className="st-prose">{c.content}</p>
                    </section>
                  ))}
                  <section className="st-card">
                    <h2>Add a verified source</h2>
                    <form onSubmit={(e) => void saveRecord(e, "research")}>
                      <div className="st-form-grid">
                        <Field label="Source title">
                          <input name="title" required />
                        </Field>
                        <Field label="Original URL">
                          <input name="url" type="url" required />
                        </Field>
                      </div>
                      <Field label="What the source establishes">
                        <textarea name="body" rows={2} />
                      </Field>
                      <button className="st-secondary" disabled={!writable || busy}>
                        Save source
                      </button>
                    </form>
                  </section>
                  <div className="st-two-col">
                    {records
                      .filter((r) => r.kind === "knowledge" || r.kind === "research")
                      .map((r) => (
                        <article key={r.id} className="st-card">
                          <span className="st-eyebrow">
                            {r.kind} · {dated(r.created_at)}
                          </span>
                          <h3>{r.title}</h3>
                          <p>{r.body.slice(0, 300)}</p>
                          {r.data.url && /^https?:\/\//.test(text(r.data.url)) ? (
                            <a
                              href={text(r.data.url)}
                              rel="noreferrer"
                              target="_blank"
                              className="st-secondary"
                            >
                              Inspect original source <ArrowRight size={14} />
                            </a>
                          ) : null}
                          <button
                            className="st-text-danger"
                            disabled={!writable}
                            onClick={() => void removeRecord(r)}
                          >
                            Remove
                          </button>
                        </article>
                      ))}
                  </div>
                </>
              )}
              {section === "forecasts" && <TrackRecord isDemo={false} />}
              {section === "analytics" && <Analytics isDemo={false} />}
              {section === "reports" && (
                <>
                  <section className="st-card">
                    <div className="st-section-head">
                      <h2>Board review</h2>
                      <button
                        className="st-primary"
                        disabled={busy || !writable}
                        onClick={() =>
                          void action(async () => {
                            await api.generateBoardMeeting(selected);
                            await refresh(selected);
                            setNotice(
                              "Review generated from this workspace's reports and tasks.",
                            );
                          })
                        }
                      >
                        Run review
                      </button>
                    </div>
                    <ReviewCadenceCard isDemo={false} />
                  </section>
                  <div className="st-two-col">
                    {reports.map((r) => (
                      <article className="st-card" key={r.id}>
                        <span className="st-eyebrow">
                          {r.agent} · {dated(r.created_at || undefined)}
                        </span>
                        <h2>{r.title}</h2>
                        <p>{r.summary}</p>
                        <div className="st-form-actions">
                          <button
                            className="st-secondary"
                            onClick={() => setReportPreview(r)}
                          >
                            Read report
                          </button>
                          <button
                            className="st-secondary"
                            onClick={() => void downloadReport(r, "pdf")}
                          >
                            PDF
                          </button>
                          <button
                            className="st-secondary"
                            onClick={() => void downloadReport(r, "md")}
                          >
                            Markdown
                          </button>
                          <button
                            className="st-secondary"
                            onClick={() =>
                              void action(async () => {
                                const shared = await api.createShareLink(r.id!);
                                await navigator.clipboard.writeText(shared.url);
                                setNotice(
                                  "Share link copied. Anyone with this link can read this report.",
                                );
                              })
                            }
                          >
                            Share
                          </button>
                          <button
                            className="st-text-danger"
                            onClick={() =>
                              void action(async () => {
                                await api.revokeShareLink(r.id!);
                                setNotice("Public share link revoked.");
                              })
                            }
                          >
                            Revoke link
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!reports.length && (
                    <Empty
                      title="Your intelligence library starts here"
                      detail="Convene the board to generate specialist reports, or run a review of your execution."
                    />
                  )}
                </>
              )}
              {section === "team" && (
                <>
                  <section className="st-card">
                    <h2>Workspace members</h2>
                    <p>
                      Add colleagues who already have a CEO.ai account. Owners manage
                      access; editors can create work; viewers can read.
                    </p>
                    {members.map((m) => (
                      <div className="st-compact-row" key={m.id}>
                        <div>
                          <strong>{m.name}</strong>
                          <small>{m.email}</small>
                        </div>
                        <span className="st-chip">{m.role}</span>
                        {workspace?.owned && m.role !== "owner" && (
                          <button
                            className="st-text-danger"
                            onClick={() =>
                              void action(async () => {
                                await studioRequest(
                                  scoped(`/members/${m.id}`),
                                  "DELETE",
                                );
                                await refresh(selected);
                              })
                            }
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}
                    {workspace?.owned && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const values = new FormData(form);
                          void action(async () => {
                            await studioRequest(scoped("/members"), "POST", {
                              email: values.get("email"),
                              role: values.get("role"),
                            });
                            form.reset();
                            await refresh(selected);
                          });
                        }}
                      >
                        <div className="st-form-grid">
                          <Field label="Colleague email">
                            <input name="email" type="email" required />
                          </Field>
                          <Field label="Access">
                            <select name="role">
                              <option value="viewer">Viewer</option>
                              <option value="editor">Editor</option>
                            </select>
                          </Field>
                        </div>
                        <button className="st-secondary" disabled={busy}>
                          Add member
                        </button>
                      </form>
                    )}
                  </section>
                  <section className="st-card">
                    <h2>Discussion</h2>
                    <form onSubmit={(e) => void saveRecord(e, "comment")}>
                      <Field label="Topic">
                        <input name="title" required />
                      </Field>
                      <Field label="Comment">
                        <textarea name="body" required rows={3} />
                      </Field>
                      <button className="st-primary" disabled={busy || !writable}>
                        Post comment
                      </button>
                    </form>
                    {currentRecords.map((r) => (
                      <article className="st-message" key={r.id}>
                        <span className="st-eyebrow">{dated(r.created_at)}</span>
                        <h3>{r.title}</h3>
                        <p className="st-prose">{r.body}</p>
                      </article>
                    ))}
                  </section>
                  <section className="st-card">
                    <h2>Activity</h2>
                    {records
                      .filter((r) => r.kind === "activity")
                      .map((r) => (
                        <div className="st-compact-row" key={r.id}>
                          <Activity size={16} />
                          <div>
                            <strong>{r.title}</strong>
                            <small>
                              {dated(r.created_at)} · {r.body.slice(0, 160)}
                            </small>
                          </div>
                        </div>
                      ))}
                    {!records.some((r) => r.kind === "activity") && (
                      <p>Your completed runs will appear here.</p>
                    )}
                  </section>
                </>
              )}
              {section === "controls" && (
                <>
                  <section className="st-card">
                    <h2>Agent routing & response budget</h2>
                    <p>
                      Local-only mode keeps board prompts on your configured Ollama
                      server. Hosted models require server configuration; provider
                      availability is not a guarantee of model health.
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const values = new FormData(e.currentTarget);
                        const old = records.find(
                          (r) =>
                            r.kind === "preferences" && r.title === "Agent controls",
                        );
                        void action(async () => {
                          await studioRequest(
                            scoped(`/records${old ? `/${old.id}` : ""}`),
                            old ? "PUT" : "POST",
                            {
                              kind: "preferences",
                              title: "Agent controls",
                              body: "Workspace model routing preferences",
                              data: {
                                provider: values.get("provider"),
                                local_only: values.get("local_only") === "true",
                                max_tokens: Number(values.get("max_tokens")),
                              },
                              version: old?.version,
                            },
                          );
                          await refresh(selected);
                          setNotice("Controls saved for future runs.");
                        });
                      }}
                    >
                      <div className="st-form-grid">
                        <Field label="Preferred provider">
                          <select
                            name="provider"
                            defaultValue={text(
                              records.find((r) => r.title === "Agent controls")?.data
                                .provider,
                            )}
                          >
                            <option value="">Automatic configured routing</option>
                            {[
                              "ollama",
                              "groq",
                              "gemini",
                              "cerebras",
                              "nvidia",
                              "openrouter",
                            ].map((p) => (
                              <option key={p}>{p}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Privacy">
                          <select
                            name="local_only"
                            defaultValue={text(
                              records.find((r) => r.title === "Agent controls")?.data
                                .local_only ?? true,
                            )}
                          >
                            <option value="true">Local only</option>
                            <option value="false">
                              Allow configured hosted providers
                            </option>
                          </select>
                        </Field>
                        <Field label="Maximum tokens per specialist">
                          <input
                            name="max_tokens"
                            type="number"
                            min={200}
                            max={2000}
                            required
                            defaultValue={text(
                              records.find((r) => r.title === "Agent controls")?.data
                                .max_tokens ?? 900,
                            )}
                          />
                        </Field>
                      </div>
                      <button className="st-primary" disabled={busy || !writable}>
                        Save agent controls
                      </button>
                    </form>
                  </section>
                  <section className="st-card">
                    <h2>Provider configuration</h2>
                    <div className="st-report-grid">{provider ? ((provider.providers || []) as (ProviderStatus & { configured: boolean; local: boolean })[]).map(p => <article key={p.name}><span className="st-eyebrow">{p.local ? "Local" : "Hosted"}</span><h3>{p.name}</h3><p>{p.model || "Default model"}</p><span className="st-chip">{p.configured ? p.cooling_down ? "Cooling down" : "Configured" : "Not configured"}</span><p>{p.served || 0} calls served since server startup</p></article>) : <p>Provider status is unavailable.</p>}</div>
                    <p>
                      Run events preserve each report&apos;s source and progress. Local
                      templates are explicitly labeled and should be treated as planning
                      prompts.
                    </p>
                  </section>
                </>
              )}
              {section === "security" && (
                <>
                  <section className="st-card">
                    <h2>Signed-in sessions</h2>
                    <p>
                      Revoking a session takes effect on its next API request. Password
                      changes revoke every session.
                    </p>
                    {sessions.map((s) => (
                      <div className="st-compact-row" key={s.id}>
                        <ShieldCheck size={18} />
                        <div>
                          <strong>{s.label}</strong>
                          <small>
                            Created {dated(s.created_at)} · Expires{" "}
                            {dated(s.expires_at)}
                          </small>
                        </div>
                        <span className="st-chip">
                          {s.revoked ? "Revoked" : "Active"}
                        </span>
                        {!s.revoked && (
                          <button
                            className="st-text-danger"
                            onClick={() =>
                              void action(async () => {
                                await studioRequest(
                                  `/api/studio/security/sessions/${s.id}`,
                                  "DELETE",
                                );
                                setSessions(
                                  await studioRequest("/api/studio/security/sessions"),
                                );
                              })
                            }
                          >
                            Revoke
                          </button>
                        )}
                      </div>
                    ))}
                  </section>
                  <section className="st-card">
                    <h2>Your workspace & data</h2>{workspace?.owned && <form onSubmit={event => { event.preventDefault(); const values = new FormData(event.currentTarget); void action(async () => { await studioRequest(`/api/studio/workspaces/${selected}`, "PATCH", { title: values.get("title") }); setWorkspaces(await studioRequest("/api/studio/workspaces")); setNotice("Workspace renamed."); }); }}><Field label="Workspace name"><input name="title" required maxLength={180} defaultValue={workspace.title}/></Field><button className="st-secondary" disabled={busy}>Rename workspace</button></form>}
                    <div className="st-form-actions">
                      <Link href="/settings" className="st-secondary">
                        Account export & deletion
                      </Link>
                      <Link href="/pricing" className="st-secondary">
                        Plans & usage
                      </Link>
                      <Link href="/halcyon" className="st-secondary">
                        Halcyon companion
                      </Link>
                    </div>
                    {workspace?.owned && (
                      <button
                        className="st-text-danger"
                        onClick={() =>
                          void action(async () => {
                            await studioRequest(scoped("/records"), "POST", {
                              kind: "archive",
                              title: "Archived workspace",
                              body: "",
                              data: {},
                            });
                            setWorkspaces(
                              await studioRequest("/api/studio/workspaces"),
                            );
                            setSelected("");
                            setNotice(
                              "Workspace archived. Its records are preserved; restore it when creating or choosing a workspace.",
                            );
                          })
                        }
                      >
                        Archive this workspace
                      </button>
                    )}
                  </section>
                </>
              )}
            </>
          )}
          <footer className="st-footer">
            CEO.ai <span>Evidence informs. People decide.</span>
            <Link href="/about-author">
              Built with intent <ArrowRight size={12} />
            </Link>
          </footer>
        </main>
      </div>
      <Dialog open={searchOpen} onClose={() => setSearchOpen(false)} title="Search workspace" className="st-search-modal">
            <div className="st-section-head">
              <h2>Find your work</h2>
              <button
                className="st-icon"
                aria-label="Close search"
                onClick={() => setSearchOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void action(async () =>
                  setResults(
                    await studioRequest(
                      `/api/studio/search/all?q=${encodeURIComponent(query)}`,
                    ),
                  ),
                );
              }}
            >
              <input
                autoFocus
                aria-label="Search query"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                minLength={2}
                placeholder="Search decisions, reports, knowledge, tasks…"
              />
              <button className="st-primary">Search</button>
            </form>
            <div className="st-search-results">
              {results.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    window.sessionStorage.setItem("ceoai-workspace", r.session_id);
                    setSelected(r.session_id);
                    setSearchOpen(false);
                    window.location.href = `/studio/${r.kind === "task" ? "execution" : r.kind === "report" ? "reports" : r.kind === "decision" ? "decisions" : "knowledge"}`;
                  }}
                >
                  <span className="st-eyebrow">{r.kind}</span>
                  <strong>{r.title}</strong>
                  <small>{r.body?.slice(0, 130)}</small>
                </button>
              ))}
            </div>
      </Dialog>
      <Dialog open={!!reportPreview} onClose={() => setReportPreview(null)} title="Report inspector" className="st-search-modal st-reading">{reportPreview && <>
            <div className="st-section-head">
              <span className="st-eyebrow">{reportPreview.agent}</span>
              <button
                className="st-icon"
                aria-label="Close report"
                onClick={() => setReportPreview(null)}
              >
                <X size={18} />
              </button>
            </div>
            <h2>{reportPreview.title}</h2>
            <p className="st-prose">{reportPreview.summary}</p>
            <ol>
              {reportPreview.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ol>
            <button
              className="st-secondary"
              onClick={() => void downloadReport(reportPreview, "pdf")}
            >
              Download PDF
            </button>
      </>}</Dialog>
    </div>
  );
}

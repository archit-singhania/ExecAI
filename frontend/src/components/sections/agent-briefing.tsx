import { useState } from "react";
import { ArrowRight, Brain } from "lucide-react";
import { AgentReport, ReportExport } from "@/lib/api";
import { agentMeta } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

export function AgentBriefing({
  reports,
  selectedReport,
  reportExport,
  openReport,
}: {
  reports: AgentReport[];
  selectedReport: AgentReport | null;
  reportExport: ReportExport | null;
  openReport: (report: AgentReport) => void;
}) {
  const [agentFilter, setAgentFilter] = useState("All");
  const agents = ["All", ...Array.from(new Set(reports.map((report) => report.agent)))];
  const filteredReports = agentFilter === "All" ? reports : reports.filter((report) => report.agent === agentFilter);

  return (
    <section className="glass-strong section-panel rounded-lg p-4 sm:p-5 3xl:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-ink to-ink/70 text-fog shadow-glow">
            <Brain size={20} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-steel">Agent Floor</p>
            <h2 className="text-xl font-black sm:text-2xl">Specialist briefings</h2>
          </div>
        </div>
        <div className="rounded-md bg-gradient-to-br from-chartreuse/40 to-chartreuse/15 px-3 py-2 text-sm font-black text-ink shadow-line">
          {filteredReports.length} active
        </div>
      </div>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {agents.map((agent) => (
          <button
            key={agent}
            onClick={() => setAgentFilter(agent)}
            className={cn(
              "shrink-0 rounded-md border px-3 py-2 text-xs font-black transition",
              agentFilter === agent
                ? "border-ink bg-ink text-fog"
                : "border-ink/10 bg-white/65 text-steel hover:bg-white dark:bg-white/5 dark:hover:bg-white/10",
            )}
          >
            {agent}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2 3xl:grid-cols-3">
        {filteredReports.map((report, index) => (
          <AgentCard key={`${report.agent}-${report.title}-${index}`} report={report} index={index} openReport={openReport} />
        ))}
      </div>
      <ReportInspector report={selectedReport} reportExport={reportExport} />
    </section>
  );
}

function ReportInspector({ report, reportExport }: { report: AgentReport | null; reportExport: ReportExport | null }) {
  if (!report) {
    return (
      <div className="mt-4 rounded-lg border border-dashed border-ink/15 bg-white/45 p-4 text-sm font-semibold leading-6 text-steel dark:bg-white/5">
        Select any specialist briefing to open a board-ready report preview and markdown export.
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-ink/10 bg-ink p-4 text-fog">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-fog/50">{report.agent}</p>
          <h3 className="mt-2 text-xl font-black leading-tight">{report.title}</h3>
        </div>
        <span className="w-fit rounded-md bg-accent px-2 py-1 text-xs font-black text-ink">{report.score}/100</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-fog/75">{report.summary}</p>
      {report.bullets.length ? (
        <div className="mt-4 grid gap-2">
          {report.bullets.map((bullet) => (
            <p key={bullet} className="rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold">
              {bullet}
            </p>
          ))}
        </div>
      ) : null}
      {reportExport ? (
        <details className="mt-4 rounded-md border border-white/10 bg-white/8 p-3">
          <summary className="cursor-pointer text-sm font-black">Markdown export: {reportExport.filename}</summary>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-black/20 p-3 text-xs leading-5 text-fog/80">
            {reportExport.markdown}
          </pre>
        </details>
      ) : null}
    </div>
  );
}

function AgentCard({
  report,
  index,
  openReport,
}: {
  report: AgentReport;
  index: number;
  openReport: (report: AgentReport) => void;
}) {
  const meta = agentMeta[report.agent] ?? { icon: Brain, tone: "bg-ink/10 text-ink", orbit: "Signal" };
  const Icon = meta.icon;

  return (
    <button
      onClick={() => openReport(report)}
      className="animate-rise group/card rounded-lg border border-ink/10 bg-white/62 p-4 text-left transition duration-200 hover:-translate-y-1 hover:border-ink/20 hover:bg-white/85 hover:shadow-glow dark:bg-white/5 dark:hover:border-fog/20 dark:hover:bg-white/[0.1]"
      style={{ animationDelay: `${index * 35}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-md", meta.tone)}>
          <Icon size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.14em] text-steel">{report.agent}</p>
              <h3 className="mt-1 font-black leading-6">{report.title}</h3>
            </div>
            <span className="rounded-md bg-ink px-2 py-1 text-xs font-black text-fog">{report.score}</span>
          </div>
          <p className="mt-2 text-sm leading-6 text-steel">{report.summary}</p>
          {report.bullets.length ? (
            <div className="mt-3 space-y-1">
              {report.bullets.slice(0, 2).map((bullet) => (
                <p key={bullet} className="flex gap-2 text-xs font-bold leading-5 text-ink/70">
                  <ArrowRight className="mt-0.5 shrink-0 text-basil" size={13} />
                  {bullet}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

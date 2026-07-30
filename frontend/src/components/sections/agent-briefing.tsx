"use client";

import { useMemo, useState } from "react";
import { Brain, Check, FileText, Inbox, Link2 } from "lucide-react";
import { AgentReport, api, ReportExport } from "@/lib/api";
import { agentMeta } from "@/lib/dashboard-data";
import { toastFromError } from "@/lib/toast";
import { LockedInline } from "@/components/dashboard/feature-lock";
import {
  DetailSheet,
  EmptyState,
  FilterRail,
  MetricRow,
  MetricStat,
  ScoreRing,
  SectionHeader,
  SectionPanel,
  SkeletonCards,
} from "@/components/dashboard/section-kit";
import { cn } from "@/lib/utils";

export function AgentBriefing({
  reports,
  selectedReport,
  reportExport,
  openReport,
  loading = false,
  onCloseReport,
  canShare = true,
}: {
  reports: AgentReport[];
  selectedReport: AgentReport | null;
  reportExport: ReportExport | null;
  openReport: (report: AgentReport) => void;
  loading?: boolean;
  onCloseReport?: () => void;
  canShare?: boolean;
}) {
  const [agentFilter, setAgentFilter] = useState("All");

  const agents = useMemo(
    () => ["All", ...Array.from(new Set(reports.map((report) => report.agent)))],
    [reports],
  );

  const counts = useMemo(() => {
    const map: Record<string, number> = { All: reports.length };
    reports.forEach((report) => {
      map[report.agent] = (map[report.agent] ?? 0) + 1;
    });
    return map;
  }, [reports]);

  const filteredReports =
    agentFilter === "All" ? reports : reports.filter((report) => report.agent === agentFilter);

  const averageScore = reports.length
    ? Math.round(reports.reduce((total, report) => total + report.score, 0) / reports.length)
    : 0;
  const topReport = reports.length
    ? reports.reduce((best, report) => (report.score > best.score ? report : best), reports[0])
    : null;
  const actionCount = reports.reduce((total, report) => total + report.bullets.length, 0);

  return (
    <SectionPanel tone="ink">
      <SectionHeader
        eyebrow="Agent floor"
        title="Specialist briefings"
        icon={Brain}
        meta={
          <span className="sec-eyebrow tabular-nums">
            {filteredReports.length} of {reports.length}
          </span>
        }
      />

      <MetricRow>
        <MetricStat label="Consensus" value={averageScore || "\u2014"} hint="mean conviction" emphasis />
        <MetricStat label="Desks" value={agents.length - 1} hint="reporting in" />
        <MetricStat label="Actions" value={actionCount} hint="recommended moves" />
        <MetricStat
          label="Strongest"
          value={topReport ? topReport.score : "\u2014"}
          hint={topReport ? topReport.agent : "no reports"}
        />
      </MetricRow>

      {agents.length > 2 ? (
        <FilterRail options={agents} value={agentFilter} onChange={setAgentFilter} counts={counts} />
      ) : null}

      {loading ? (
        <SkeletonCards count={4} />
      ) : filteredReports.length ? (
        <div className="sec-stagger grid gap-3 md:grid-cols-2 3xl:grid-cols-3">
          {filteredReports.map((report, index) => (
            <AgentCard
              key={`${report.agent}-${report.title}-${index}`}
              report={report}
              index={index}
              openReport={openReport}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Inbox}
          title="No briefings from this desk yet"
          body="Each specialist files a report once the CEO has run a session on your goal. Switch back to All, or start a session to bring the floor online."
        />
      )}

      <DetailSheet
        open={!!selectedReport}
        onClose={() => onCloseReport?.()}
        eyebrow={selectedReport?.agent}
        title={selectedReport?.title}
        badge={selectedReport ? <ScoreRing score={selectedReport.score} size={44} /> : null}
      >
        {selectedReport ? (
          <div className="pt-4">
            {selectedReport.id ? (
              canShare ? (
                <ShareRow reportId={selectedReport.id} />
              ) : (
                <LockedInline tier="pro" label="Share this report" />
              )
            ) : null}
            <p className="mt-4 text-sm font-medium leading-7 text-steel">{selectedReport.summary}</p>

            {selectedReport.bullets.length ? (
              <div className="mt-5">
                <p className="sec-eyebrow mb-2.5">Recommended moves</p>
                <ol className="sec-stagger space-y-2">
                  {selectedReport.bullets.map((bullet, index) => (
                    <li
                      key={bullet}
                      className="sec-card sec-card-edge flex gap-3 rounded-lg py-2.5 pl-4 pr-3.5"
                      style={{ animationDelay: `${index * 45}ms` }}
                    >
                      <span className="mt-0.5 shrink-0 text-[0.7rem] font-black tabular-nums text-steel">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[0.82rem] font-semibold leading-6">{bullet}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}

            {reportExport ? (
              <details className="sec-card mt-5 rounded-lg p-4">
                <summary className="flex cursor-pointer items-center gap-2 text-[0.8rem] font-bold">
                  <FileText size={15} className="text-steel" />
                  {reportExport.filename}
                </summary>
                <pre className="command-scroll mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-ink/5 p-3 text-[0.72rem] leading-6 text-steel dark:bg-fog/5">
                  {reportExport.markdown}
                </pre>
              </details>
            ) : null}
          </div>
        ) : null}
      </DetailSheet>
    </SectionPanel>
  );
}

function ShareRow({ reportId }: { reportId: string }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function share() {
    setBusy(true);
    try {
      const result = await api.createShareLink(reportId);
      setUrl(result.url);
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch (error) {
      toastFromError(error, "Couldn't create a share link");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sec-card flex flex-wrap items-center justify-between gap-3 rounded-lg px-3.5 py-2.5">
      <p className="min-w-0 flex-1 truncate text-[0.75rem] font-semibold text-steel">
        {url || "Create a public link anyone can read."}
      </p>
      <button type="button" onClick={share} disabled={busy} className="sec-rail-item shrink-0">
        {copied ? <Check size={13} /> : <Link2 size={13} />}
        {copied ? "Copied" : url ? "Copy again" : "Share"}
      </button>
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
      type="button"
      onClick={() => openReport(report)}
      style={{ animationDelay: `${index * 45}ms` }}
      className="sec-card sec-card-interactive sec-card-edge group w-full rounded-lg p-4 pl-5 text-left"
    >
      <div className="flex items-start gap-3">
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-md", meta.tone)}>
          <Icon size={18} strokeWidth={1.9} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="sec-eyebrow truncate">{report.agent}</p>
              <h3 className="mt-1 text-[0.9rem] font-bold leading-6 tracking-[-0.01em]">{report.title}</h3>
            </div>
            <ScoreRing score={report.score} />
          </div>

          <p className="mt-2 line-clamp-2 text-[0.8rem] font-medium leading-6 text-steel">{report.summary}</p>

          {report.bullets.length ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="sec-eyebrow">{meta.orbit}</span>
              <span className="h-1 w-1 rounded-full bg-steel/40" />
              <span className="text-[0.7rem] font-bold text-steel">
                {report.bullets.length} action{report.bullets.length === 1 ? "" : "s"}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

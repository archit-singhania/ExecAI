"use client";

import { FormEvent } from "react";
import { Gavel, History, Search, Sparkles, Volume2 } from "lucide-react";
import { AgentReport, Memory } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  ScoreRing,
  SectionHeader,
  SectionPanel,
} from "@/components/dashboard/section-kit";
import { ReviewCadenceCard } from "@/components/dashboard/review-cadence-card";
import { FeatureLock } from "@/components/dashboard/feature-lock";

export function BoardTheater({
  boardReport,
  boardHistory,
  memories,
  memoryQuery,
  memoryResults,
  setMemoryQuery,
  searchMemory,
  loading,
  canRunBoard,
  generateBoardMeeting,
  isDemo,
  canSchedule = true,
}: {
  boardReport: AgentReport | null;
  boardHistory: AgentReport[];
  memories: Memory[];
  memoryQuery: string;
  memoryResults: Memory[];
  setMemoryQuery: (value: string) => void;
  searchMemory: (event: FormEvent) => void;
  loading: boolean;
  canRunBoard: boolean;
  generateBoardMeeting: () => void;
  isDemo?: boolean;
  canSchedule?: boolean;
}) {
  const trail = memoryResults.length ? memoryResults : memories;

  return (
    <SectionPanel tone="teal">
      <SectionHeader
        eyebrow="Board room"
        title="Weekly review"
        icon={Gavel}
        meta={
          boardHistory.length ? (
            <span className="sec-eyebrow tabular-nums">{boardHistory.length} on record</span>
          ) : null
        }
        actions={
          <Button variant="ghost" onClick={generateBoardMeeting} disabled={loading || !canRunBoard}>
            <Volume2 size={15} />
            {loading ? "Convening\u2026" : "Run review"}
          </Button>
        }
      />

      {boardReport ? (
        <div className="relative overflow-hidden rounded-lg bg-ink p-5 text-fog shadow-glow">
          <div className="executive-gradient absolute inset-0 opacity-60" />
          <div className="top-beam" />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[0.625rem] font-bold uppercase tracking-[0.18em] text-fog/50">
                  CEO board verdict
                </p>
                <h3 className="mt-2 text-xl font-bold leading-tight tracking-[-0.015em] sm:text-2xl">
                  {boardReport.title}
                </h3>
              </div>
              <div className="shrink-0 rounded-xl bg-white/10 p-1.5">
                <ScoreRing score={boardReport.score} size={52} />
              </div>
            </div>

            <p className="mt-3 max-w-2xl text-[0.85rem] font-medium leading-7 text-fog/70">
              {boardReport.summary}
            </p>

            {boardReport.bullets.length ? (
              <ol className="sec-stagger mt-5 grid gap-2">
                {boardReport.bullets.map((bullet, index) => (
                  <li
                    key={bullet}
                    style={{ animationDelay: `${index * 55}ms` }}
                    className="flex gap-3 rounded-md border border-white/10 bg-white/10 px-3.5 py-2.5"
                  >
                    <span className="mt-0.5 shrink-0 text-[0.7rem] font-black tabular-nums text-fog/45">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[0.82rem] font-semibold leading-6">{bullet}</span>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="No board review yet"
          body="Once the CEO has produced reports and tasks, the board scores your progress, names what slipped, and reads the verdict aloud."
          action={
            <Button variant="ghost" onClick={generateBoardMeeting} disabled={loading || !canRunBoard}>
              <Volume2 size={15} />
              Run first review
            </Button>
          }
        />
      )}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <FeatureLock
          unlocked={canSchedule}
          tier="pro"
          title="Let the board meet without you"
          body="Set a weekly cadence and the board scores your progress and emails the verdict, whether or not you open the app."
        >
          <ReviewCadenceCard isDemo={isDemo} />
        </FeatureLock>

        <div className="sec-card rounded-lg p-4">
          <div className="mb-3 flex items-center gap-2">
            <History size={14} className="text-steel" />
            <p className="sec-eyebrow">Board history</p>
          </div>

          {boardHistory.length ? (
            <div className="sec-stagger space-y-2">
              {boardHistory.slice(0, 4).map((report, index) => (
                <div
                  key={report.id ?? report.title}
                  style={{ animationDelay: `${index * 45}ms` }}
                  className="sec-soft-row flex items-center justify-between gap-3 rounded-md px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[0.82rem] font-bold leading-5">{report.title}</p>
                    <p className="mt-0.5 text-[0.7rem] font-semibold text-steel">
                      {report.created_at ? new Date(report.created_at).toLocaleDateString() : "Recent"}
                    </p>
                  </div>
                  <ScoreRing score={report.score} size={34} />
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-[0.8rem] font-medium leading-6 text-steel">
              Past reviews will stack up here so you can watch the trend, not just the last verdict.
            </p>
          )}
        </div>

        <div className="sec-card rounded-lg p-4">
          <div className="mb-3 flex items-center gap-2">
            <Search size={14} className="text-steel" />
            <p className="sec-eyebrow">Memory trail</p>
          </div>

          <form onSubmit={searchMemory} className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={memoryQuery}
              onChange={(event) => setMemoryQuery(event.target.value)}
              placeholder="Search decisions and strategy…"
              className="sec-input h-9 rounded-md px-3 text-[0.8rem] font-semibold"
            />
            <button
              type="submit"
              className="rounded-md bg-ink px-3.5 py-2 text-[0.72rem] font-bold text-fog transition hover:opacity-90 dark:bg-fog dark:text-ink"
            >
              Search
            </button>
          </form>

          {trail.length ? (
            <div className="sec-stagger space-y-2">
              {trail.slice(0, 5).map((memory, index) => (
                <div
                  key={memory.id}
                  style={{ animationDelay: `${index * 45}ms` }}
                  className="sec-soft-row rounded-md px-3 py-2.5"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="sec-eyebrow">{memory.kind}</span>
                    {memory.importance >= 0.85 ? (
                      <span className="h-1 w-1 rounded-full bg-ember" title="High importance" />
                    ) : null}
                  </div>
                  <p className="mt-1 line-clamp-2 text-[0.8rem] font-semibold leading-6">{memory.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-[0.8rem] font-medium leading-6 text-steel">
              {memoryQuery ? "Nothing matched that search." : "The CEO's long-term memory fills as you work."}
            </p>
          )}
        </div>
      </div>
    </SectionPanel>
  );
}

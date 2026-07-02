import { FormEvent } from "react";
import { Volume2 } from "lucide-react";
import { AgentReport, Memory, Session } from "@/lib/api";
import { Button } from "@/components/ui/button";

export function BoardTheater({
  boardReport,
  boardHistory,
  memories,
  memoryQuery,
  memoryResults,
  setMemoryQuery,
  searchMemory,
  loading,
  session,
  generateBoardMeeting,
}: {
  boardReport: AgentReport | null;
  boardHistory: AgentReport[];
  memories: Memory[];
  memoryQuery: string;
  memoryResults: Memory[];
  setMemoryQuery: (value: string) => void;
  searchMemory: (event: FormEvent) => void;
  loading: boolean;
  session: Session | null;
  generateBoardMeeting: () => void;
}) {
  return (
    <section className="glass-strong rounded-lg p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-steel">Board Room</p>
          <h2 className="text-xl font-black sm:text-2xl">Weekly review</h2>
        </div>
        <Button variant="ghost" onClick={generateBoardMeeting} disabled={loading || !session}>
          <Volume2 size={16} />
          Run
        </Button>
      </div>

      <div className="relative overflow-hidden rounded-lg bg-ink p-4 text-fog">
        <div className="executive-gradient absolute inset-0 opacity-70" />
        <div className="relative">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-fog/55">CEO board verdict</p>
          <h3 className="mt-3 text-2xl font-black leading-tight">
            {boardReport?.title ?? "No board meeting generated yet"}
          </h3>
          <p className="mt-3 text-sm leading-6 text-fog/70">
            {boardReport?.summary ??
              "Generate a board review after the CEO has created reports and tasks. It will score progress, call out missed work, and speak the summary aloud."}
          </p>
          {boardReport ? (
            <div className="mt-4 grid gap-2">
              {boardReport.bullets.map((bullet) => (
                <p key={bullet} className="rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold">
                  {bullet}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {boardHistory.length ? (
        <div className="mt-4 rounded-lg border border-ink/10 bg-white/58 p-4 dark:border-fog/10 dark:bg-white/5">
          <h3 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-steel">Board history</h3>
          <div className="space-y-2">
            {boardHistory.slice(0, 3).map((report) => (
              <div
                key={report.id ?? report.title}
                className="flex items-start justify-between gap-3 rounded-md bg-fog px-3 py-2 dark:bg-white/5"
              >
                <div>
                  <p className="text-sm font-black">{report.title}</p>
                  <p className="text-xs font-semibold text-steel">
                    {report.created_at ? new Date(report.created_at).toLocaleString() : "Recent"}
                  </p>
                </div>
                <span className="rounded-md bg-ink px-2 py-1 text-xs font-black text-fog dark:bg-fog dark:text-ink">{report.score}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-lg border border-ink/10 bg-white/58 p-4 dark:border-fog/10 dark:bg-white/5">
        <h3 className="mb-3 text-sm font-black uppercase tracking-[0.18em] text-steel">Memory trail</h3>
        <form onSubmit={searchMemory} className="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={memoryQuery}
            onChange={(event) => setMemoryQuery(event.target.value)}
            placeholder="Search CEO memory..."
            className="h-10 rounded-md border border-ink/10 bg-white/70 px-3 text-sm font-semibold outline-none dark:border-fog/10 dark:bg-white/5"
          />
          <button className="rounded-md bg-ink px-3 py-2 text-xs font-black text-fog dark:bg-fog dark:text-ink">Search</button>
        </form>
        <div className="space-y-2">
          {(memoryResults.length ? memoryResults : memories).map((memory) => (
            <div key={memory.id} className="rounded-md bg-fog px-3 py-2 dark:bg-white/5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-steel">{memory.kind}</p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold leading-6">{memory.content}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

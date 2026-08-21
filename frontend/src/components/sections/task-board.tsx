"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleCheck, ListChecks } from "lucide-react";
import { Task } from "@/lib/api";
import { TaskFilter } from "@/lib/dashboard-data";
import { haptics, useSwipe } from "@/lib/use-interactions";
import {
  EmptyState,
  FilterRail,
  MetricRow,
  MetricStat,
  SectionHeader,
  SectionPanel,
} from "@/components/dashboard/section-kit";
import { cn } from "@/lib/utils";

const FILTERS: TaskFilter[] = ["All", "Open", "High", "Done"];

function isDone(task: Task) {
  return task.status.toLowerCase() === "done";
}

export function TaskBoard({
  tasks,
  allTasks,
  taskFilter,
  setTaskFilter,
  completeTask,
}: {
  tasks: Task[];
  allTasks?: Task[];
  taskFilter: TaskFilter;
  setTaskFilter: (filter: TaskFilter) => void;
  completeTask: (taskId: string) => void;
}) {
  const source = allTasks ?? tasks;
  const done = source.filter(isDone).length;
  const high = source.filter((task) => task.priority === "High" && !isDone(task)).length;
  const open = source.length - done;
  const progress = source.length ? Math.round((done / source.length) * 100) : 0;

  const counts: Record<string, number> = {
    All: source.length,
    Open: open,
    High: high,
    Done: done,
  };

  return (
    <SectionPanel tone="cobalt">
      <SectionHeader
        eyebrow="Execution"
        title="Priority tasks"
        icon={ListChecks}
        meta={<span className="sec-eyebrow tabular-nums">{progress}% complete</span>}
      />

      <MetricRow>
        <MetricStat label="Shipped" value={`${done}/${source.length}`} hint="tasks closed" emphasis />
        <MetricStat label="Open" value={open} hint="still in flight" />
        <MetricStat label="High priority" value={high} hint="needs you first" />
        <MetricStat label="Progress" value={`${progress}%`} hint="of the board" />
      </MetricRow>

      <div className="sec-meter mb-4" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div className="sec-meter-fill" style={{ width: `${progress}%` }} />
      </div>

      <p className="sec-note">
        These came out of your board sessions, not a template. Tick one and the board counts it
        at the next review &mdash; on a phone, swipe right to close it.
      </p>

      <FilterRail
        options={FILTERS}
        value={taskFilter}
        onChange={(next) => setTaskFilter(next as TaskFilter)}
        counts={counts}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <KanbanColumn title="Open" tasks={tasks.filter(t => t.status.toLowerCase() !== "done" && t.priority !== "High")} completeTask={completeTask} />
        <KanbanColumn title="High Priority" tasks={tasks.filter(t => t.status.toLowerCase() !== "done" && t.priority === "High")} completeTask={completeTask} />
        <KanbanColumn title="Done" tasks={tasks.filter(t => t.status.toLowerCase() === "done")} completeTask={completeTask} />
      </div>
    </SectionPanel>
  );
}

function KanbanColumn({ title, tasks, completeTask }: { title: string; tasks: Task[]; completeTask: (taskId: string) => void }) {
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-black/5 dark:bg-white/5 border border-ink/5 dark:border-white/5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-ink dark:text-fog">{title}</h3>
        <span className="text-xs font-semibold text-steel bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      {tasks.length === 0 ? (
        <div className="text-xs text-steel/60 text-center py-6 border border-dashed border-ink/10 dark:border-white/10 rounded-lg">
          Empty
        </div>
      ) : (
        <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} index={0} completeTask={completeTask} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  index,
  completeTask,
}: {
  task: Task;
  index: number;
  completeTask: (taskId: string) => void;
}) {
  const complete = isDone(task);

  const { offset, settling, handlers } = useSwipe({
    onRight: () => {
      if (!complete) completeTask(task.id);
    },
  });

  return (
    <div className="swipe-row" style={{ animationDelay: `${index * 45}ms` }}>
      {offset !== 0 ? (
        <div className="swipe-action">
          <span className="swipe-action-done">{complete ? "" : "Mark done"}</span>
          <span />
        </div>
      ) : null}

      <div
        {...handlers}
        className={cn(
          "swipe-surface sec-card sec-card-edge rounded-lg p-4 pl-5 transition",
          settling && "swipe-surface-settling",
          complete && "opacity-70",
        )}
        style={{ transform: offset ? `translateX(${offset}px)` : undefined }}
      >
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => {
              if (complete) return;
              haptics.success();
              completeTask(task.id);
            }}
            disabled={complete}
            aria-label={complete ? "Task complete" : `Mark ${task.title} done`}
            className={cn(
              "sec-check mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md",
              complete && "sec-check-done",
            )}
          >
            <Check size={13} strokeWidth={3} />
          </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p
              className={cn(
                "text-[0.9rem] font-bold leading-6 tracking-[-0.01em]",
                complete && "line-through decoration-steel/50",
              )}
            >
              {task.title}
            </p>
            {task.priority === "High" && !complete ? (
              <span className="shrink-0 rounded-md bg-ember/10 px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-[0.1em] text-ember">
                High
              </span>
            ) : null}
          </div>

          {task.description ? (
            <p className="mt-1.5 text-[0.8rem] font-medium leading-6 text-steel">{task.description}</p>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="sec-eyebrow">{task.created_by_agent}</span>
            <span className="h-1 w-1 rounded-full bg-steel/40" />
            <span className="text-[0.7rem] font-bold text-steel">
              {complete ? "Completed" : task.status}
            </span>
            <span className="ml-auto hidden text-[0.66rem] font-semibold text-steel/70 sm:inline">
              {complete ? "" : "Swipe right to close"}
            </span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

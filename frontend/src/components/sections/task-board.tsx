"use client";

import { useEffect, useRef, useState } from "react";
import { Check, CircleCheck, ListChecks } from "lucide-react";
import { Task } from "@/lib/api";
import { TaskFilter } from "@/lib/dashboard-data";
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

      <FilterRail
        options={FILTERS}
        value={taskFilter}
        onChange={(next) => setTaskFilter(next as TaskFilter)}
        counts={counts}
      />

      {tasks.length ? (
        <TaskList tasks={tasks} completeTask={completeTask} />
      ) : (
        <EmptyState
          icon={CircleCheck}
          title={taskFilter === "Done" ? "Nothing closed yet" : "This lane is clear"}
          body={
            taskFilter === "Done"
              ? "Completed tasks land here so you can see momentum building week over week."
              : "Your specialists create tasks as the CEO works through your goal. Run a session to fill the board."
          }
        />
      )}
    </SectionPanel>
  );
}

const VIRTUALISE_ABOVE = 60;
const ESTIMATED_ROW = 118;
const OVERSCAN = 6;

function TaskList({
  tasks,
  completeTask,
}: {
  tasks: Task[];
  completeTask: (taskId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ start: 0, end: 40 });

  const virtualise = tasks.length > VIRTUALISE_ABOVE;

  useEffect(() => {
    if (!virtualise) return;

    const scroller = containerRef.current?.closest(".command-scroll") as HTMLElement | null;
    if (!scroller) return;

    let frame = 0;

    function measure() {
      frame = 0;
      const node = containerRef.current;
      if (!node || !scroller) return;

      const offset = node.offsetTop;
      const scrolled = Math.max(0, scroller.scrollTop - offset);
      const start = Math.max(0, Math.floor(scrolled / ESTIMATED_ROW) - OVERSCAN);
      const visible = Math.ceil(scroller.clientHeight / ESTIMATED_ROW) + OVERSCAN * 2;

      setRange({ start, end: Math.min(tasks.length, start + visible) });
    }

    function onScroll() {
      if (!frame) frame = requestAnimationFrame(measure);
    }

    measure();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [tasks.length, virtualise]);

  if (!virtualise) {
    return (
      <div className="sec-stagger space-y-2.5">
        {tasks.map((task, index) => (
          <TaskRow key={task.id} task={task} index={index} completeTask={completeTask} />
        ))}
      </div>
    );
  }

  const slice = tasks.slice(range.start, range.end);

  return (
    <div ref={containerRef}>
      <div style={{ height: range.start * ESTIMATED_ROW }} aria-hidden />
      <div className="space-y-2.5">
        {slice.map((task) => (
          <TaskRow key={task.id} task={task} index={0} completeTask={completeTask} />
        ))}
      </div>
      <div style={{ height: Math.max(0, (tasks.length - range.end) * ESTIMATED_ROW) }} aria-hidden />
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

  return (
    <div
      style={{ animationDelay: `${index * 45}ms` }}
      className={cn(
        "sec-card sec-card-edge rounded-lg p-4 pl-5 transition",
        complete && "opacity-70",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => (complete ? undefined : completeTask(task.id))}
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
          </div>
        </div>
      </div>
    </div>
  );
}

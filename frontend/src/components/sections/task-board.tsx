import { Check } from "lucide-react";
import { Task } from "@/lib/api";
import { TaskFilter } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

export function TaskBoard({
  tasks,
  taskFilter,
  setTaskFilter,
  completeTask,
}: {
  tasks: Task[];
  taskFilter: TaskFilter;
  setTaskFilter: (filter: TaskFilter) => void;
  completeTask: (taskId: string) => void;
}) {
  return (
    <section className="glass-strong rounded-lg p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-steel">Execution</p>
          <h2 className="text-xl font-black sm:text-2xl">Priority tasks</h2>
        </div>
        <Check className="text-basil" size={24} />
      </div>
      <div className="mb-4 grid grid-cols-4 gap-2">
        {(["All", "Open", "High", "Done"] as TaskFilter[]).map((filter) => (
          <button
            key={filter}
            onClick={() => setTaskFilter(filter)}
            className={cn(
              "rounded-md px-2 py-2 text-xs font-black transition",
              taskFilter === filter
                ? "bg-ink text-fog dark:bg-fog dark:text-ink"
                : "bg-white/70 text-steel hover:bg-white dark:bg-white/5 dark:hover:bg-white/10",
            )}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="group rounded-lg border border-ink/10 bg-white/62 p-4 transition hover:-translate-y-0.5 hover:shadow-soft dark:border-fog/10 dark:bg-white/5"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <p className="font-black leading-6">{task.title}</p>
              <span
                className={cn(
                  "w-fit rounded-md px-2 py-1 text-xs font-black",
                  task.priority === "High" ? "bg-ember text-white" : "bg-ink text-fog dark:bg-fog dark:text-ink",
                )}
              >
                {task.priority}
              </span>
            </div>
            {task.description ? <p className="mt-2 text-sm leading-6 text-steel">{task.description}</p> : null}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-steel">{task.created_by_agent}</p>
              {task.status.toLowerCase() !== "done" ? (
                <button
                  className="rounded-md border border-ink/10 bg-white px-3 py-2 text-xs font-black transition hover:bg-chartreuse/30 dark:border-fog/10 dark:bg-white/5 dark:hover:bg-white/10"
                  onClick={() => completeTask(task.id)}
                >
                  Mark done
                </button>
              ) : (
                <span className="rounded-md bg-basil/10 px-3 py-2 text-xs font-black text-basil">Completed</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

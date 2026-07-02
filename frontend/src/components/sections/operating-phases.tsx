import { operatingPhases } from "@/lib/dashboard-data";

export function OperatingPhases() {
  return (
    <section className="glass-strong rounded-lg p-4 sm:p-5">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-steel">Roadmap</p>
        <h2 className="text-xl font-black sm:text-2xl">Operating phases</h2>
      </div>
      <div className="space-y-3">
        {operatingPhases.map((phase, index) => (
          <div key={phase} className="flex items-center gap-3 rounded-lg bg-white/62 p-3 shadow-line dark:bg-white/5 dark:shadow-line-dark">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-accent/30 text-sm font-black">{index + 1}</div>
            <div className="min-w-0 flex-1">
              <p className="font-black">{phase}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/8 dark:bg-fog/10">
                <div className="h-full rounded-full bg-ink dark:bg-fog" style={{ width: `${Math.min(100, 45 + index * 9)}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

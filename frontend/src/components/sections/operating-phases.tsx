import { operatingPhases } from "@/lib/dashboard-data";

export function OperatingPhases() {
  return (
    <section className="glass-strong section-panel rounded-lg p-4 sm:p-5">
      <div className="mb-5">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-steel">Roadmap</p>
        <h2 className="text-xl font-black sm:text-2xl">Operating phases</h2>
      </div>
      <div className="space-y-3">
        {operatingPhases.map((phase, index) => (
          <div key={phase} className="group flex items-center gap-3 rounded-lg bg-white/62 p-3 shadow-line transition duration-200 hover:-translate-y-0.5 hover:bg-white/85 hover:shadow-glow dark:bg-white/5 dark:shadow-line-dark dark:hover:bg-white/[0.1]">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-gradient-to-br from-accent/50 to-accent/20 text-sm font-black shadow-line">{index + 1}</div>
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

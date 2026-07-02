import { Activity, Files } from "lucide-react";
import { AgentReport } from "@/lib/api";
import { Signal } from "@/components/ui/metric-signal";

export function KpiRunway({ reports, opportunityScore }: { reports: AgentReport[]; opportunityScore: number }) {
  const sorted = [...reports].sort((a, b) => b.score - a.score).slice(0, 6);

  return (
    <section className="glass-strong rounded-lg p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-steel">Business Intelligence</p>
          <h2 className="text-xl font-black sm:text-2xl">Signal map</h2>
        </div>
        <div className="rounded-md bg-ink px-3 py-2 text-sm font-black text-fog dark:bg-fog dark:text-ink">{opportunityScore}/100</div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg bg-ink p-5 text-fog">
          <p className="text-sm font-bold text-fog/60">Executive read</p>
          <p className="mt-3 text-2xl font-black leading-tight sm:text-3xl">Validation approved. Full build blocked until proof.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Signal icon={Files} label="Reports" value={`${reports.length}`} />
            <Signal icon={Activity} label="Cadence" value="Weekly" />
          </div>
        </div>
        <div className="space-y-3">
          {sorted.map((report) => (
            <div key={`${report.agent}-${report.title}`} className="rounded-lg border border-ink/10 bg-white/62 p-3 dark:border-fog/10 dark:bg-white/5">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-black">{report.agent}</p>
                <p className="text-sm font-black text-steel">{report.score}</p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-ink/8 dark:bg-fog/10">
                <div className="h-full rounded-full bg-gradient-to-r from-ember via-chartreuse to-basil" style={{ width: `${report.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

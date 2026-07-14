import { Activity, Files } from "lucide-react";
import { AgentReport } from "@/lib/api";
import { Signal } from "@/components/ui/metric-signal";

export function KpiRunway({ reports, opportunityScore }: { reports: AgentReport[]; opportunityScore: number }) {
  const sorted = [...reports].sort((a, b) => b.score - a.score).slice(0, 6);

  return (
    <section className="glass-strong section-panel rounded-lg p-4 sm:p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-steel/40 to-steel/15 text-steel shadow-line">
            <Activity size={20} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-steel">Business Intelligence</p>
            <h2 className="text-xl font-black sm:text-2xl">Signal map</h2>
          </div>
        </div>
        <div className="rounded-md bg-gradient-to-br from-ink to-ink/75 px-3 py-2 text-sm font-black text-fog shadow-glow dark:bg-fog dark:text-ink">{opportunityScore}/100</div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="relative overflow-hidden rounded-lg bg-ink p-5 text-fog shadow-glow">
          <div className="executive-gradient absolute inset-0 opacity-60" />
          <div className="relative">
          <p className="text-sm font-bold text-fog/60">Executive read</p>
          <p className="mt-3 text-2xl font-black leading-tight sm:text-3xl">Validation approved. Full build blocked until proof.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <Signal icon={Files} label="Reports" value={`${reports.length}`} />
            <Signal icon={Activity} label="Cadence" value="Weekly" />
          </div>
          </div>
        </div>
        <div className="space-y-3">
          {sorted.map((report) => (
            <div key={`${report.agent}-${report.title}`} className="group rounded-lg border border-ink/10 bg-white/62 p-3 transition duration-200 hover:-translate-y-0.5 hover:bg-white/85 hover:shadow-glow dark:border-fog/10 dark:bg-white/5 dark:hover:bg-white/[0.1]">
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

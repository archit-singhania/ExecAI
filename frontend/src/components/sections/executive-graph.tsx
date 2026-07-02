import { Brain, CheckCircle2, CircleDollarSign, Gauge, Layers3, LineChart, Orbit } from "lucide-react";
import { agentMeta } from "@/lib/dashboard-data";
import { DarkMetric, Signal } from "@/components/ui/metric-signal";

export function ExecutiveGraph({
  healthScore,
  opportunityScore,
  runway,
  doneTasks,
  taskCount,
}: {
  healthScore: number;
  opportunityScore: number;
  runway: number;
  doneTasks: number;
  taskCount: number;
}) {
  const orbitAgents = Object.entries(agentMeta);

  return (
    <div className="relative min-h-[520px] overflow-hidden bg-ink p-4 text-fog sm:p-5">
      <div className="executive-gradient absolute inset-0" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(246,244,238,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(246,244,238,0.06)_1px,transparent_1px)] bg-[size:42px_42px]" />
      <div className="relative grid h-full content-between gap-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <DarkMetric icon={Gauge} label="Health" value={`${healthScore}%`} />
          <DarkMetric icon={LineChart} label="Opportunity" value={`${opportunityScore}`} />
          <DarkMetric icon={CircleDollarSign} label="Runway" value={`${runway} mo`} />
          <DarkMetric icon={CheckCircle2} label="Tasks" value={`${doneTasks}/${taskCount}`} />
        </div>

        <div className="relative mx-auto grid aspect-square w-full max-w-[330px] place-items-center sm:max-w-[430px]">
          <div className="absolute inset-8 rounded-full border border-white/10" />
          <div className="absolute inset-16 rounded-full border border-dashed border-white/15" />
          <div className="absolute inset-0 animate-spin-slow rounded-full border border-transparent border-t-accent/70" />
          <div className="absolute inset-12 animate-reverse-spin rounded-full border border-transparent border-r-ember/70" />
          <div className="absolute grid h-28 w-28 place-items-center rounded-full border border-white/15 bg-white/10 text-center shadow-[0_0_80px_rgba(183,202,93,0.22)] backdrop-blur-xl sm:h-36 sm:w-36">
            <div>
              <Brain className="mx-auto mb-2 text-accent" size={26} />
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-fog/55 sm:text-xs">CEO Core</p>
              <p className="mt-1 text-2xl font-black">{healthScore}</p>
            </div>
          </div>

          {orbitAgents.map(([name, meta], index) => {
            const angle = (index / orbitAgents.length) * Math.PI * 2 - Math.PI / 2;
            const radius = 42;
            const x = 50 + Math.cos(angle) * radius;
            const y = 50 + Math.sin(angle) * radius;
            const Icon = meta.icon;

            return (
              <div
                key={name}
                className="absolute hidden -translate-x-1/2 -translate-y-1/2 rounded-lg border border-white/12 bg-white/12 px-3 py-2 shadow-glass backdrop-blur-md sm:block"
                style={{ left: `${x}%`, top: `${y}%` }}
              >
                <div className="flex items-center gap-2">
                  <Icon className="text-accent" size={15} />
                  <div>
                    <p className="text-xs font-black">{meta.orbit}</p>
                    <p className="text-[10px] font-semibold text-fog/50">{name}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-3 gap-2 sm:hidden">
          {orbitAgents.slice(0, 6).map(([name, meta]) => {
            const Icon = meta.icon;
            return (
              <div key={name} className="rounded-md border border-white/10 bg-white/10 px-2 py-2 text-center backdrop-blur">
                <Icon className="mx-auto mb-1 text-accent" size={15} />
                <p className="text-[10px] font-black">{meta.orbit}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Signal icon={Layers3} label="Architecture" value="Next + FastAPI + LangGraph" />
          <Signal icon={Orbit} label="Operating Mode" value="Contrarian + accountable" />
        </div>
      </div>
    </div>
  );
}

"use client";

import { Check, CircleDot, Clock } from "lucide-react";
import { operatingRoadmap, PhaseStatus } from "@/lib/dashboard-data";
import { cn } from "@/lib/utils";

const STATUS_META: Record<PhaseStatus, { label: string; icon: React.ElementType; className: string }> = {
  shipped: { label: "Shipped", icon: Check, className: "sec-phase-shipped" },
  building: { label: "Building", icon: CircleDot, className: "sec-phase-building" },
  next: { label: "Next", icon: Clock, className: "sec-phase-next" },
};

export function OperatingPhases() {
  const shipped = operatingRoadmap.filter((phase) => phase.status === "shipped").length;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="sec-eyebrow">Roadmap</p>
        <span className="text-[0.7rem] font-bold tabular-nums text-steel">
          {shipped}/{operatingRoadmap.length} shipped
        </span>
      </div>

      <ol className="sec-stagger relative space-y-1">
        {operatingRoadmap.map((phase, index) => {
          const meta = STATUS_META[phase.status];
          const Icon = meta.icon;
          const last = index === operatingRoadmap.length - 1;

          return (
            <li
              key={phase.name}
              style={{ animationDelay: `${index * 45}ms` }}
              className="relative flex gap-3 pb-1"
            >
              <div className="relative flex flex-col items-center">
                <span className={cn("sec-phase-node grid h-6 w-6 place-items-center rounded-full", meta.className)}>
                  <Icon size={12} strokeWidth={2.6} />
                </span>
                {last ? null : <span className="sec-phase-line" />}
              </div>

              <div className="min-w-0 flex-1 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      "text-[0.85rem] font-bold leading-5 tracking-[-0.01em]",
                      phase.status === "next" && "text-steel",
                    )}
                  >
                    {phase.name}
                  </p>
                  {phase.status !== "shipped" ? (
                    <span className={cn("sec-phase-chip", meta.className)}>{meta.label}</span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-[0.75rem] font-medium leading-5 text-steel">{phase.note}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

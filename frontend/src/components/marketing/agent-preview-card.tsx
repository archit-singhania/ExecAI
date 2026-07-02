import { cn } from "@/lib/utils";

export function AgentPreviewCard({
  icon: Icon,
  name,
  orbit,
  tone,
  pitch,
}: {
  icon: React.ElementType;
  name: string;
  orbit: string;
  tone: string;
  pitch: string;
}) {
  return (
    <div className="glass animate-rise flex min-w-0 flex-col gap-2 rounded-lg p-3 transition hover:-translate-y-0.5 sm:p-3.5">
      <div className="flex items-center gap-2.5">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md", tone)}>
          <Icon size={16} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-black leading-none sm:text-sm">{name}</p>
          <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-wide text-steel">{orbit}</p>
        </div>
      </div>
      <p className="text-[0.72rem] leading-5 text-steel sm:text-xs">{pitch}</p>
    </div>
  );
}

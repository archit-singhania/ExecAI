import { cn } from "@/lib/utils";

export function StatusPill({
  icon: Icon,
  label,
  pulse = false,
}: {
  icon: React.ElementType;
  label: string;
  pulse?: boolean;
}) {
  return (
    <div
      title={label}
      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-ink/10 bg-white/60 px-3 text-xs font-black text-ink shadow-line backdrop-blur transition dark:bg-white/5 dark:shadow-line-dark"
    >
      <span className={cn("relative grid h-5 w-5 shrink-0 place-items-center rounded-full", pulse ? "text-accent" : "text-steel")}>
        <Icon size={13} />
        {pulse ? <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-accent/30" /> : null}
      </span>
      <span className="hidden max-w-[10rem] truncate sm:inline lg:max-w-none">{label}</span>
    </div>
  );
}

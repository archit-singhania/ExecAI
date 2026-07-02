import { Radio, ShieldCheck, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { ThemeModeToggle, AccentPicker } from "@/components/ui/theme-controls";

export function DashboardTopbar({
  title,
  booting,
  loading,
  hasSession,
  onBoardReview,
}: {
  title: string;
  booting: boolean;
  loading: boolean;
  hasSession: boolean;
  onBoardReview: () => void;
}) {
  return (
    <header className="glass-strong flex shrink-0 flex-col gap-3 rounded-lg border-b-2 border-b-accent/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <h1 className="text-base font-black tracking-tight sm:text-lg">{title}</h1>

      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <div className="hidden items-center gap-2 sm:flex">
          <StatusPill icon={Radio} label={booting ? "Connecting" : "Live system"} pulse />
          <StatusPill icon={ShieldCheck} label="Human approval mode" />
        </div>

        <div className="mx-1 hidden h-6 w-px bg-ink/10 sm:block" />

        <div className="flex items-center gap-2">
          <ThemeModeToggle />
          <AccentPicker />
          <Button variant="ghost" onClick={onBoardReview} disabled={loading || !hasSession}>
            Board Review <Volume2 size={16} />
          </Button>
        </div>
      </div>
    </header>
  );
}

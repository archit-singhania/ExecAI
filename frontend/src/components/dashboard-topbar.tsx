import Link from "next/link";
import { ChevronLeft, Radio, ShieldCheck, Sparkles, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { ThemeModeToggle, ThemeConfigurator } from "@/components/ui/theme-controls";
import { LanguagePicker } from "@/components/ui/language-picker";

export function DashboardTopbar({
  title,
  booting,
  loading,
  hasSession,
  isDemo,
  onBoardReview,
  onBack,
}: {
  title: string;
  booting: boolean;
  loading: boolean;
  hasSession: boolean;
  isDemo?: boolean;
  onBoardReview: () => void;
  onBack?: () => void;
}) {
  return (
    <header className="glass-strong flex shrink-0 flex-col gap-3 rounded-lg border-b-2 border-b-accent/40 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <div className="flex flex-wrap items-center gap-2.5">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 rounded-md border border-ink/10 bg-white/55 px-2.5 py-1.5 text-xs font-bold text-ink transition hover:bg-white dark:border-ink/20 dark:bg-ink/[0.08] dark:hover:bg-ink/[0.14]"
          >
            <ChevronLeft size={15} />
            Home
          </button>
        ) : null}
        <h1 className="text-base font-black tracking-tight sm:text-lg">{title}</h1>
        {isDemo ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/15 px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-wide text-ink dark:text-fog">
            <Sparkles size={11} className="text-accent" />
            Demo mode
          </span>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        {isDemo ? (
          <Link
            href="/signup"
            className="hidden items-center gap-1.5 rounded-md border border-ink/10 bg-white/60 px-3 py-1.5 text-xs font-bold text-steel transition hover:border-ink/25 hover:text-ink dark:border-fog/10 dark:bg-white/5 dark:hover:border-fog/25 sm:flex"
          >
            Sign up to save this
          </Link>
        ) : null}

        <div className="hidden items-center gap-2 sm:flex">
          <StatusPill icon={Radio} label={booting ? "Connecting" : isDemo ? "Demo · sample data" : "Live system"} pulse />
          <StatusPill icon={ShieldCheck} label="Human approval mode" />
        </div>

        <div className="mx-1 hidden h-6 w-px bg-ink/10 sm:block" />

        <div className="flex items-center gap-2">
          <ThemeModeToggle />
          <ThemeConfigurator />
          <LanguagePicker />
          <Button variant="ghost" onClick={onBoardReview} disabled={loading || !hasSession}>
            Board Review <Volume2 size={16} />
          </Button>
        </div>
      </div>
    </header>
  );
}

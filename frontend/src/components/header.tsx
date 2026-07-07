import { Radio, ShieldCheck, Volume2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { HeroTitle } from "@/components/hero-title";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { ThemeModeToggle, ThemeConfigurator } from "@/components/ui/theme-controls";
import { LanguagePicker } from "@/components/ui/language-picker";

export function Header({
  booting,
  loading,
  hasSession,
  onBoardReview,
}: {
  booting: boolean;
  loading: boolean;
  hasSession: boolean;
  onBoardReview: () => void;
}) {
  return (
    <header className="glass-strong sticky top-2 z-30 flex flex-col gap-4 rounded-lg border-b-2 border-b-accent/40 px-3 py-3 sm:top-4 sm:px-4 md:flex-row md:items-center md:justify-between 3xl:px-6 3xl:py-4">
      <div className="flex min-w-0 items-center gap-3 3xl:gap-4">
        <Logo size={44} />
        <HeroTitle />
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill icon={Radio} label={booting ? "Connecting" : "Live system"} pulse />
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

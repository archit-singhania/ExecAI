import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeModeToggle } from "@/components/ui/theme-controls";

export function MarketingNav() {
  return (
    <header className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex items-center gap-2.5">
        <Logo size={36} />
        <span className="text-sm font-black tracking-tight sm:text-base">CEO.ai</span>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <ThemeModeToggle />
        <Link href="/login">
          <Button variant="ghost" className="h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm">
            Log in
          </Button>
        </Link>
        <Link href="/signup">
          <Button className="h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm">Start free trial</Button>
        </Link>
      </div>
    </header>
  );
}

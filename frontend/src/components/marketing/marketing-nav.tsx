"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeModeToggle, ThemeConfigurator } from "@/components/ui/theme-controls";
import { LanguagePicker } from "@/components/ui/language-picker";
import { useLocale } from "@/lib/i18n";

export function MarketingNav() {
  const { t } = useLocale();

  return (
    <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex items-center gap-2.5">
        <Logo size={36} />
        <span className="text-sm font-black tracking-tight sm:text-base">CEO.ai</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <ThemeModeToggle />
        <ThemeConfigurator />
        <LanguagePicker />
        <Link href="/trial">
          <Button variant="quiet" className="h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm">
            {t("nav.tryDemo")}
          </Button>
        </Link>
        <Link href="/login">
          <Button variant="ghost" className="h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm">
            {t("nav.login")}
          </Button>
        </Link>
        <Link href="/signup">
          <Button className="h-9 px-3 text-xs sm:h-10 sm:px-4 sm:text-sm">{t("nav.signup")}</Button>
        </Link>
      </div>
    </header>
  );
}

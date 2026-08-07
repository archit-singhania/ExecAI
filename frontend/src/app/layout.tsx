import type { Metadata } from "next";
import { Instrument_Serif, Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/lib/i18n";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CEO.ai",
  description: "Hire an AI CEO to plan, challenge, and operate your startup.",
};

const noFlashScript = `
(function () {
  try {
    var storedMode = window.localStorage.getItem("ceoai-theme-mode");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var mode = storedMode || (prefersDark ? "dark" : "light");
    if (mode === "dark") document.documentElement.classList.add("dark");

    var storedAccent = window.localStorage.getItem("ceoai-theme-accent");
    if (storedAccent) document.documentElement.style.setProperty("--color-accent", storedAccent);

    var storedSurfaceKey = mode === "dark" ? "ceoai-theme-surface-dark" : "ceoai-theme-surface-light";
    var storedSurface = window.localStorage.getItem(storedSurfaceKey);
    if (storedSurface) document.documentElement.style.setProperty("--color-surface", storedSurface);

    var storedLocale = window.localStorage.getItem("ceoai-locale") || "en";
    var storedRtl = window.localStorage.getItem("ceoai-rtl-override");
    document.documentElement.lang = storedLocale;
    document.documentElement.dir = storedRtl === null ? (storedLocale === "ar" ? "rtl" : "ltr") : (storedRtl === "true" ? "rtl" : "ltr");
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body suppressHydrationWarning>
        <LocaleProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </LocaleProvider>
        <div className="grain-overlay" aria-hidden />
      </body>
    </html>
  );
}

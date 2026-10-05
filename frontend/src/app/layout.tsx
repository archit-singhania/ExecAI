import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/lib/i18n";
import "./globals.css";
// Order matters. tokens.css redefines the custom properties globals.css sets;
// premium.css refines component rules and must therefore load last.
import "@/styles/tokens.css";
import "@/styles/primitives.css";
import "@/styles/premium.css";
import "@/styles/material.css";
import "@/styles/liquid-glass.css";

export const metadata: Metadata = {
  title: "CEO.ai — Executive Studio",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/brand/compass.svg", apple: "/brand/compass-180.png" },
  description: "Hire an AI CEO to plan, challenge, and operate your startup.",
};

const noFlashScript = `
(function () {
  try {
    var storedMode = window.localStorage.getItem("ceoai-theme-mode");
    var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var mode = !storedMode || storedMode === "system" ? (prefersDark ? "dark" : "light") : storedMode;
    if (mode === "dark") document.documentElement.classList.add("dark");

    var storedAccent = window.localStorage.getItem("ceoai-theme-accent");
    if (storedAccent) document.documentElement.style.setProperty("--color-accent", storedAccent);

    var storedSurfaceKey = mode === "dark" ? "ceoai-theme-surface-dark" : "ceoai-theme-surface-light";
    var storedSurface = window.localStorage.getItem(storedSurfaceKey);
    if (storedSurface) document.documentElement.style.setProperty("--color-surface", storedSurface);

    var comfort = JSON.parse(window.localStorage.getItem("ceoai-visual-comfort") || "{}");
    if (comfort.reducedMotion === true) document.documentElement.classList.add("reduce-motion");
    if (comfort.reducedTransparency === true) document.documentElement.classList.add("reduce-transparency");
    if (comfort.highContrast === true) document.documentElement.classList.add("increase-contrast");

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
    <html lang="en" className="ceo-material" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body suppressHydrationWarning>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <LocaleProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </LocaleProvider>
        <div className="grain-overlay" aria-hidden />
      </body>
    </html>
  );
}

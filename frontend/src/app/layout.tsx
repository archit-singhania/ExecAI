import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

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
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: noFlashScript }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}

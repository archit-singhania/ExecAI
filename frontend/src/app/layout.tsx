import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CEO.ai",
  description: "Hire an AI CEO to plan, challenge, and operate your startup.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

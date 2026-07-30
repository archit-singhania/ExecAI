import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";

type SharedReport = {
  title: string;
  agent: string;
  report_type: string;
  summary: string;
  bullets: string[];
  score: number;
  created_at: string;
  author: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function fetchShared(slug: string): Promise<SharedReport | null> {
  try {
    const response = await fetch(`${API_URL}/api/share/${slug}`, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as SharedReport;
  } catch {
    return null;
  }
}

function scoreColor(score: number) {
  if (score >= 85) return "#1d6f5f";
  if (score >= 70) return "#5b7ad6";
  if (score >= 50) return "#b7ca5d";
  return "#d45f3a";
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const report = await fetchShared(slug);

  if (!report) return { title: "Report not found · CEO.ai" };

  return {
    title: `${report.title} · CEO.ai`,
    description: report.summary.slice(0, 155),
    openGraph: {
      title: report.title,
      description: report.summary.slice(0, 155),
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: report.title,
      description: report.summary.slice(0, 155),
    },
  };
}

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const report = await fetchShared(slug);

  if (!report) notFound();

  const color = scoreColor(report.score);

  return (
    <main className="min-h-[100dvh] bg-radial-ui px-5 py-10 text-ink sm:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <nav className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="text-sm font-bold tracking-tight">CEO.ai</span>
          </Link>
          <span className="sec-eyebrow">Shared report</span>
        </nav>

        <article className="glass-strong mt-10 rounded-xl p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="sec-eyebrow">{report.agent}</p>
              <h1 className="mt-2 text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-3xl">
                {report.title}
              </h1>
            </div>

            <div className="shrink-0 text-right">
              <p
                className="text-3xl font-black tabular-nums leading-none tracking-[-0.03em]"
                style={{ color }}
              >
                {report.score}
              </p>
              <p className="sec-eyebrow mt-1">conviction</p>
            </div>
          </div>

          <p className="mt-5 text-[0.95rem] font-medium leading-8 text-steel">{report.summary}</p>

          {report.bullets.length ? (
            <ol className="mt-6 space-y-2">
              {report.bullets.map((bullet, index) => (
                <li key={bullet} className="sec-card sec-card-edge flex gap-3 rounded-lg py-3 pl-4 pr-4">
                  <span className="mt-0.5 shrink-0 text-[0.72rem] font-black tabular-nums text-steel">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[0.85rem] font-semibold leading-6">{bullet}</span>
                </li>
              ))}
            </ol>
          ) : null}

          <p className="mt-7 border-t border-ink/10 pt-5 text-[0.78rem] font-semibold text-steel dark:border-fog/10">
            Filed for {report.author} on{" "}
            {new Date(report.created_at).toLocaleDateString(undefined, {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </article>

        <section className="mt-8 text-center">
          <p className="text-[0.95rem] font-medium leading-8 text-steel">
            This report was written by one of nine specialists who examine a business
            independently — and are allowed to disagree.
          </p>
          <Link href="/signup" className="err-btn err-btn-primary mt-5 inline-flex">
            Convene your own board
            <ArrowRight size={15} />
          </Link>
          <p className="mt-3 text-[0.75rem] font-semibold text-steel">Free to start.</p>
        </section>

        <div className="h-16" />
      </div>
    </main>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCcw, TriangleAlert } from "lucide-react";

export function RouteError({
  error,
  reset,
  area,
  backHref = "/dashboard",
  backLabel = "Back to dashboard",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  area: string;
  backHref?: string;
  backLabel?: string;
}) {
  useEffect(() => {
    console.error(`[CEO.ai] ${area} error:`, error);
  }, [area, error]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-radial-ui px-5 py-16 text-ink">
      <div className="glass-strong w-full max-w-md rounded-xl p-6 sm:p-7">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-ember/10 text-ember">
          <TriangleAlert size={20} strokeWidth={1.9} />
        </div>

        <p className="sec-eyebrow mt-4">{area}</p>
        <h1 className="mt-2 text-lg font-bold tracking-[-0.01em]">
          This section failed to load
        </h1>

        <p className="mt-2 text-[0.85rem] font-medium leading-7 text-steel">
          The rest of the app is fine — only {area.toLowerCase()} stopped working. Your data is
          untouched.
        </p>

        {error.digest ? (
          <p className="mt-4 rounded-md bg-ink/[0.04] px-3 py-2 font-mono text-[0.7rem] text-steel dark:bg-fog/[0.05]">
            {error.digest}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={reset} className="err-btn err-btn-primary">
            <RefreshCcw size={15} />
            Try again
          </button>
          <Link href={backHref} className="err-btn">
            <ArrowLeft size={15} />
            {backLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}

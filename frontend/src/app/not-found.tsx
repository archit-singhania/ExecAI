import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export const metadata = {
  title: "Not found · CEO.ai",
};

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-radial-ui px-5 py-16 text-ink">
      <div className="glass-strong w-full max-w-md rounded-xl p-6 sm:p-7">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-ink/[0.06] text-steel dark:bg-fog/[0.07]">
          <Compass size={20} strokeWidth={1.8} />
        </div>

        <h1 className="mt-4 text-lg font-bold tracking-[-0.01em]">There&apos;s nothing at this address</h1>

        <p className="mt-2 text-[0.85rem] font-medium leading-7 text-steel">
          The page you were looking for has either moved or never existed. The dashboard is
          probably where you meant to go.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/dashboard" className="err-btn err-btn-primary">
            <ArrowLeft size={15} />
            Back to dashboard
          </Link>
          <Link href="/" className="err-btn">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}

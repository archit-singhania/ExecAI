"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { authApi } from "@/lib/auth";
import { Logo } from "@/components/logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || busy) return;

    setBusy(true);
    setError("");
    try {
      await authApi.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-radial-ui px-5 py-16 text-ink">
      <div className="glass-strong w-full max-w-md rounded-xl p-6 sm:p-8">
        <Logo size={32} />

        {sent ? (
          <>
            <div className="mt-5 grid h-11 w-11 place-items-center rounded-lg bg-basil/10 text-basil">
              <MailCheck size={20} strokeWidth={1.9} />
            </div>
            <h1 className="mt-4 text-lg font-bold tracking-[-0.01em]">Check your inbox</h1>
            <p className="mt-2 text-[0.85rem] font-medium leading-7 text-steel">
              If <span className="font-bold text-ink dark:text-fog">{email}</span> has an account,
              a reset link is on its way. It works once and expires in an hour.
            </p>
            <p className="mt-3 text-[0.8rem] font-medium leading-6 text-steel">
              Nothing arrived? Check spam, then try again.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-5 text-[0.8rem] font-bold text-accent hover:underline"
            >
              Use a different email
            </button>
          </>
        ) : (
          <>
            <h1 className="mt-5 text-lg font-bold tracking-[-0.01em]">Reset your password</h1>
            <p className="mt-2 text-[0.85rem] font-medium leading-7 text-steel">
              Enter the email on your account and we&apos;ll send a link to set a new password.
            </p>

            <form onSubmit={submit} className="mt-6">
              <label htmlFor="email" className="sec-eyebrow">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="sec-input mt-2 h-11 w-full rounded-md px-3 text-[0.88rem] font-semibold"
              />

              {error ? (
                <p className="mt-3 text-[0.8rem] font-bold text-ember">{error}</p>
              ) : null}

              <button type="submit" disabled={busy} className="err-btn err-btn-primary mt-5 w-full justify-center">
                {busy ? <Loader2 size={15} className="animate-spin" /> : null}
                Send reset link
              </button>
            </form>
          </>
        )}

        <div className="mt-6 border-t border-ink/10 pt-5 dark:border-fog/10">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-[0.8rem] font-bold text-steel hover:text-ink dark:hover:text-fog">
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

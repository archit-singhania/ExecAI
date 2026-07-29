"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { authApi, storeSession } from "@/lib/auth";
import { Logo } from "@/components/logo";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && password !== confirm;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || password.length < 8 || password !== confirm) return;

    setBusy(true);
    setError("");
    try {
      const result = await authApi.resetPassword(token, password);
      storeSession(result);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "That link didn't work. Request a new one.");
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <>
        <h1 className="mt-5 text-lg font-bold tracking-[-0.01em]">This link is incomplete</h1>
        <p className="mt-2 text-[0.85rem] font-medium leading-7 text-steel">
          The reset link is missing its token. Some email clients truncate long URLs — try
          copying the whole thing, or request a fresh one.
        </p>
        <Link href="/forgot-password" className="err-btn err-btn-primary mt-5 w-full justify-center">
          Request a new link
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="mt-5 grid h-11 w-11 place-items-center rounded-lg bg-accent/10 text-accent">
        <ShieldCheck size={20} strokeWidth={1.9} />
      </div>

      <h1 className="mt-4 text-lg font-bold tracking-[-0.01em]">Choose a new password</h1>
      <p className="mt-2 text-[0.85rem] font-medium leading-7 text-steel">
        At least 8 characters. You&apos;ll be signed in straight afterwards.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="password" className="sec-eyebrow">
            New password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="sec-input mt-2 h-11 w-full rounded-md px-3 text-[0.88rem] font-semibold"
          />
          {tooShort ? (
            <p className="mt-1.5 text-[0.75rem] font-semibold text-steel">
              {8 - password.length} more character{8 - password.length === 1 ? "" : "s"} needed.
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="confirm" className="sec-eyebrow">
            Confirm password
          </label>
          <input
            id="confirm"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="sec-input mt-2 h-11 w-full rounded-md px-3 text-[0.88rem] font-semibold"
          />
          {mismatch ? (
            <p className="mt-1.5 text-[0.75rem] font-semibold text-ember">
              These don&apos;t match yet.
            </p>
          ) : null}
        </div>

        {error ? <p className="text-[0.8rem] font-bold text-ember">{error}</p> : null}

        <button
          type="submit"
          disabled={busy || password.length < 8 || password !== confirm}
          className="err-btn err-btn-primary w-full justify-center disabled:opacity-50"
        >
          {busy ? <Loader2 size={15} className="animate-spin" /> : null}
          Set password and sign in
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-radial-ui px-5 py-16 text-ink">
      <div className="glass-strong w-full max-w-md rounded-xl p-6 sm:p-8">
        <Logo size={32} />
        <Suspense fallback={<p className="mt-6 text-[0.85rem] font-semibold text-steel">Loading…</p>}>
          <ResetForm />
        </Suspense>
        <div className="mt-6 border-t border-ink/10 pt-5 dark:border-fog/10">
          <Link href="/login" className="text-[0.8rem] font-bold text-steel hover:text-ink dark:hover:text-fog">
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

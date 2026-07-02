"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Mail, User } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { authApi, storeSession } from "@/lib/auth";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isSignup = mode === "signup";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const auth = isSignup ? await authApi.signup(name, email, password) : await authApi.login(email, password);
      storeSession(auth);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex h-[100dvh] min-h-[560px] flex-col overflow-y-auto bg-radial-ui text-ink">
      <div className="ambient-grid absolute inset-0" />
      <div className="scanline pointer-events-none absolute inset-0" />

      <div className="relative flex flex-1 items-center justify-center px-4 py-6 sm:px-6">
        <div className="glass-strong animate-rise w-full max-w-md rounded-lg p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-2.5">
            <Logo size={36} />
            <span className="text-sm font-black tracking-tight">CEO.ai</span>
          </div>

          <h1 className="text-2xl font-black leading-tight sm:text-[1.7rem]">
            {isSignup ? "Start your free trial" : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-sm text-steel">
            {isSignup
              ? "Nine specialist agents and a CEO, ready to challenge your next move."
              : "Log in to pick up where your boardroom left off."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-3">
            {isSignup ? (
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-steel">Name</span>
                <div className="flex items-center gap-2 rounded-md border border-ink/10 bg-white/75 px-3 dark:border-fog/10 dark:bg-white/5">
                  <User size={16} className="shrink-0 text-steel" />
                  <input
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ada Lovelace"
                    className="h-11 w-full bg-transparent text-sm font-semibold outline-none"
                  />
                </div>
              </label>
            ) : null}

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-steel">Email</span>
              <div className="flex items-center gap-2 rounded-md border border-ink/10 bg-white/75 px-3 dark:border-fog/10 dark:bg-white/5">
                <Mail size={16} className="shrink-0 text-steel" />
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@company.com"
                  className="h-11 w-full bg-transparent text-sm font-semibold outline-none"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-steel">Password</span>
              <div className="flex items-center gap-2 rounded-md border border-ink/10 bg-white/75 px-3 dark:border-fog/10 dark:bg-white/5">
                <Lock size={16} className="shrink-0 text-steel" />
                <input
                  required
                  type="password"
                  minLength={isSignup ? 8 : undefined}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={isSignup ? "At least 8 characters" : "Your password"}
                  className="h-11 w-full bg-transparent text-sm font-semibold outline-none"
                />
              </div>
            </label>

            {error ? <p className="rounded-md bg-ember/10 px-3 py-2 text-xs font-semibold text-ember">{error}</p> : null}

            <Button disabled={loading} className="h-12 w-full">
              {loading ? <Loader2 className="animate-spin" size={17} /> : null}
              {isSignup ? "Create free account" : "Log in"}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-steel">
            {isSignup ? (
              <>
                Already have an account?{" "}
                <Link href="/login" className="font-bold text-ink hover:text-accent">
                  Log in
                </Link>
              </>
            ) : (
              <>
                New here?{" "}
                <Link href="/signup" className="font-bold text-ink hover:text-accent">
                  Start a free trial
                </Link>
              </>
            )}
          </p>
        </div>
      </div>
    </main>
  );
}

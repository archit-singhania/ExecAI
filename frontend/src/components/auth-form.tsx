"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  Target,
  User,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { SceneStack } from "@/components/ui/scene-stack";
import { ThemeModeToggle, ThemeConfigurator } from "@/components/ui/theme-controls";
import { LanguagePicker } from "@/components/ui/language-picker";
import { authApi, startDemoSession, storeSession } from "@/lib/auth";
import { agentMeta } from "@/lib/dashboard-data";
import { useLocale } from "@/lib/i18n";

const SHOWCASE_AGENTS: Array<keyof typeof agentMeta> = [
  "Market Research",
  "CFO",
  "CTO",
  "Sales",
  "Marketing",
  "Legal",
];

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Strong", "Excellent"];

function passwordStrength(value: string): number {
  if (value.length < 8) return 0;

  let score = 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^\w\s]/.test(value)) score += 1;

  return Math.min(4, score);
}

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const { t } = useLocale();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isSignup = mode === "signup";
  const strength = useMemo(() => passwordStrength(password), [password]);

  function enterDemo() {
    startDemoSession();
    router.push("/dashboard");
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const auth = isSignup
        ? await authApi.signup(name, email, password)
        : await authApi.login(email, password);
      storeSession(auth);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      id="main"
      data-surface="app"
      className="relative flex h-[100dvh] min-h-[640px] flex-col overflow-y-auto bg-radial-ui text-ink"
    >
      <div className="pointer-events-none absolute inset-0 opacity-50 mix-blend-screen dark:opacity-40">
        <SceneStack id="auth" layers={["vortex", "volumetric", "aurora"]} />
      </div>

      <div className="relative flex items-center justify-end gap-2 px-4 pt-4 sm:px-6">
        <ThemeModeToggle />
        <ThemeConfigurator />
        <LanguagePicker />
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 py-6 sm:px-6">
        <div className="glass-strong backdrop-blur-xl bg-white/40 dark:bg-black/40 animate-rise grid w-full max-w-4xl overflow-hidden rounded-xl shadow-glow lg:grid-cols-[1.05fr_0.95fr]">
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="mb-7 flex items-center gap-2.5">
              <Logo size={38} />
              <span className="text-sm font-bold tracking-tight">CEO.ai</span>
              <span className="nav-live-dot" aria-hidden title="Live system" />
            </div>

            <h1 className="text-[1.7rem] font-bold leading-[1.08] tracking-[-0.02em] sm:text-3xl">
              {isSignup ? t("auth.signupTitle") : t("auth.loginTitle")}
            </h1>
            <p className="mt-2.5 text-sm leading-7 text-steel">
              {isSignup ? t("auth.signupSubtitle") : t("auth.loginSubtitle")}
            </p>

            <form onSubmit={onSubmit} className="mt-7 space-y-3.5">
              {isSignup ? (
                <Field label={t("auth.nameLabel")} required>
                  {(props) => (
                    <Input
                      required
                      autoComplete="name"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Ada Lovelace"
                      icon={<User size={15} />}
                      {...props}
                    />
                  )}
                </Field>
              ) : null}

              <Field label={t("auth.emailLabel")} required>
                {(props) => (
                  <Input
                    required
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    icon={<Mail size={15} />}
                    {...props}
                  />
                )}
              </Field>

              <div>
                <Field label={t("auth.passwordLabel")} required error={error || undefined}>
                  {(props) => (
                    <Input
                      required
                      type={showPassword ? "text" : "password"}
                      autoComplete={isSignup ? "new-password" : "current-password"}
                      minLength={isSignup ? 8 : undefined}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={isSignup ? "At least 8 characters" : "Your password"}
                      icon={<Lock size={15} />}
                      suffix={
                        <button
                          type="button"
                          onClick={() => setShowPassword((current) => !current)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      }
                      {...props}
                    />
                  )}
                </Field>

                {isSignup && password ? (
                  <div className="mt-2 flex items-center gap-2">
                    <div
                      className="ui-strength"
                      role="meter"
                      aria-valuenow={strength}
                      aria-valuemin={0}
                      aria-valuemax={4}
                      aria-label="Password strength"
                    >
                      {[0, 1, 2, 3].map((step) => (
                        <span
                          key={step}
                          className="ui-strength-bar"
                          data-on={step < strength ? strength : undefined}
                        />
                      ))}
                    </div>
                    <span className="ui-strength-label">{STRENGTH_LABELS[strength]}</span>
                  </div>
                ) : null}
              </div>

              {!isSignup ? (
                <div className="text-right">
                  <Link
                    href="/forgot-password"
                    className="text-[0.72rem] font-bold text-steel transition hover:text-accent"
                  >
                    Forgot your password?
                  </Link>
                </div>
              ) : null}

              <Button
                disabled={loading || (isSignup && strength === 0)}
                className="h-12 w-full accent-glow"
              >
                {loading ? <Loader2 className="animate-spin" size={17} /> : <Sparkles size={16} />}
                {isSignup ? t("auth.signupButton") : t("auth.loginButton")}
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-ink/10 dark:border-fog/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white/40 px-2 text-steel dark:bg-black/40 backdrop-blur-sm rounded-md">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="ghost" className="h-11 border border-ink/10 dark:border-white/10 bg-white/20 dark:bg-black/20 hover:bg-white/40 dark:hover:bg-black/40">
                  <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="github" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"></path></svg>
                  GitHub
                </Button>
                <Button type="button" variant="ghost" className="h-11 border border-ink/10 dark:border-white/10 bg-white/20 dark:bg-black/20 hover:bg-white/40 dark:hover:bg-black/40">
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                  Google
                </Button>
              </div>

              <button type="button" onClick={enterDemo} className="af-demo mt-4">
                {isSignup ? "Or look around first — no account needed" : "Skip sign-in — explore a live demo"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-steel">
              {isSignup ? (
                <>
                  {t("auth.alreadyAccount")}{" "}
                  <Link href="/login" className="font-bold text-ink hover:text-accent dark:text-fog">
                    {t("auth.loginLink")}
                  </Link>
                </>
              ) : (
                <>
                  {t("auth.newHere")}{" "}
                  <Link href="/signup" className="font-bold text-ink hover:text-accent dark:text-fog">
                    {t("auth.signupLink")}
                  </Link>
                </>
              )}
            </p>
          </div>

          <div className="executive-gradient relative hidden flex-col justify-between overflow-hidden p-8 text-fog lg:flex">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(246,244,238,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(246,244,238,0.06)_1px,transparent_1px)] bg-[size:36px_36px]" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-[0.7rem] font-bold backdrop-blur">
                {isSignup ? <ShieldCheck size={14} className="text-accent" /> : <Target size={14} className="text-accent" />}
                {isSignup ? "Human approval mode" : "Your board is waiting"}
              </div>

              <h2 className="mt-5 text-2xl font-bold leading-tight tracking-[-0.015em]">
                {isSignup
                  ? "A boardroom that argues back — before your money moves."
                  : "Nine specialists. One verdict. And a record of who was right."}
              </h2>

              <p className="mt-3.5 text-sm leading-7" style={{ color: "rgb(194 202 213 / 72%)" }}>
                {isSignup
                  ? "Nine specialists pressure-test demand, guard runway, and scope the build. Where they disagree, you see the spread rather than a comfortable average."
                  : "Every prediction your board makes is dated and falsifiable. Over time you learn exactly which desk to trust."}
              </p>
            </div>

            {isSignup ? (
              <div className="relative grid grid-cols-2 gap-2.5">
                {SHOWCASE_AGENTS.map((agentName, index) => {
                  const meta = agentMeta[agentName];
                  const Icon = meta.icon;
                  return (
                    <div
                      key={agentName}
                      className="animate-rise flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur"
                      style={{ animationDelay: `${index * 60}ms` }}
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/10 text-accent">
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold leading-none">{agentName}</p>
                        <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-wide text-[rgb(152,162,175)]">
                          {meta.orbit}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="relative space-y-2.5">
                {[
                  "Weekly reviews land whether you open the app or not",
                  "Conviction spread shows where the real risk sits",
                  "Every call is scored, so trust is earned not assumed",
                ].map((line, index) => (
                  <div
                    key={line}
                    className="animate-rise flex items-start gap-2.5"
                    style={{ animationDelay: `${index * 70}ms` }}
                  >
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-accent/25 text-accent">
                      <Check size={10} strokeWidth={3} />
                    </span>
                    <p className="text-[0.82rem] leading-6" style={{ color: "rgb(194 202 213 / 78%)" }}>
                      {line}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <p className="relative text-[0.7rem] text-[rgb(152,162,175)]">
              {isSignup ? "Free to start. No card required." : "€0 to keep using the free plan."}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

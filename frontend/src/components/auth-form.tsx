"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
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
  const [passwordChanged, setPasswordChanged] = useState(false);

  useEffect(() => {
    setPasswordChanged(
      mode === "login" &&
        new URLSearchParams(window.location.search).get("password") === "changed",
    );
  }, [mode]);

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
      router.push("/studio");
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
        <div className="material-atmosphere" aria-hidden="true" />
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
            </div>

            <h1 className="text-[1.7rem] font-bold leading-[1.08] tracking-[-0.02em] sm:text-3xl">
              {isSignup ? t("auth.signupTitle") : t("auth.loginTitle")}
            </h1>
            <p className="mt-2.5 text-sm leading-7 text-steel">
              {isSignup ? t("auth.signupSubtitle") : t("auth.loginSubtitle")}
            </p>

            {passwordChanged && (
              <p
                role="status"
                className="mt-4 rounded-xl border border-positive/20 bg-positive/5 p-3 text-sm text-ink"
              >
                Your password changed. Sign in again with your new password; previous
                sessions have been revoked.
              </p>
            )}

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
                <Field
                  label={t("auth.passwordLabel")}
                  required
                  error={error || undefined}
                >
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
                    <span className="ui-strength-label">
                      {STRENGTH_LABELS[strength]}
                    </span>
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
                type="submit"
                disabled={loading || (isSignup && strength === 0)}
                className="h-12 w-full accent-glow"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={17} />
                ) : (
                  <Sparkles size={16} />
                )}
                {isSignup ? t("auth.signupButton") : t("auth.loginButton")}
              </Button>

              <button type="button" onClick={enterDemo} className="af-demo mt-4">
                {isSignup
                  ? "Or look around first — no account needed"
                  : "Skip sign-in — explore the labeled demo"}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-steel">
              {isSignup ? (
                <>
                  {t("auth.alreadyAccount")}{" "}
                  <Link
                    href="/login"
                    className="font-bold text-ink hover:text-accent dark:text-fog"
                  >
                    {t("auth.loginLink")}
                  </Link>
                </>
              ) : (
                <>
                  {t("auth.newHere")}{" "}
                  <Link
                    href="/signup"
                    className="font-bold text-ink hover:text-accent dark:text-fog"
                  >
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
                {isSignup ? (
                  <ShieldCheck size={14} className="text-accent" />
                ) : (
                  <Target size={14} className="text-accent" />
                )}
                {isSignup ? "Human approval mode" : "Your board is waiting"}
              </div>

              <h2 className="mt-5 text-2xl font-bold leading-tight tracking-[-0.015em]">
                {isSignup
                  ? "A boardroom that argues back — before your money moves."
                  : "Nine specialists. One verdict. And a record of who was right."}
              </h2>

              <p
                className="mt-3.5 text-sm leading-7"
                style={{ color: "rgb(194 202 213 / 72%)" }}
              >
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
                        <p className="truncate text-xs font-bold leading-none">
                          {agentName}
                        </p>
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
                    <p
                      className="text-[0.82rem] leading-6"
                      style={{ color: "rgb(194 202 213 / 78%)" }}
                    >
                      {line}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <p className="relative text-[0.7rem] text-[rgb(152,162,175)]">
              {isSignup
                ? "Free to start. No card required."
                : "€0 to keep using the free plan."}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

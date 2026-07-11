"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail, ShieldCheck, Sparkles, User } from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { ThemeModeToggle, ThemeConfigurator } from "@/components/ui/theme-controls";
import { LanguagePicker } from "@/components/ui/language-picker";
import { authApi, startDemoSession, storeSession } from "@/lib/auth";
import { agentMeta } from "@/lib/dashboard-data";
import { useLocale } from "@/lib/i18n";

const SHOWCASE_AGENTS: Array<keyof typeof agentMeta> = ["Market Research", "CFO", "CTO", "Sales", "Marketing", "Legal"];

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

  function enterDemo() {
    startDemoSession();
    router.push("/dashboard");
  }

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
    <main className="relative flex h-[100dvh] min-h-[640px] flex-col overflow-y-auto bg-radial-ui text-ink">
      <div className="scanline pointer-events-none absolute inset-0" />
      <AnimatedBackground />

      <div className="relative flex items-center justify-end gap-2 px-4 pt-4 sm:px-6">
        <ThemeModeToggle />
        <ThemeConfigurator />
        <LanguagePicker />
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 py-6 sm:px-6">
        <div className="glass-strong animate-rise grid w-full max-w-4xl overflow-hidden rounded-xl shadow-glow lg:grid-cols-[1.05fr_0.95fr]">
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="mb-7 flex items-center gap-2.5">
              <Logo size={38} />
              <span className="text-sm font-black tracking-tight">CEO.ai</span>
              <span className="nav-live-dot" aria-hidden title="Live system" />
            </div>

            <h1 className="text-[1.7rem] font-black leading-[1.05] sm:text-3xl">
              {isSignup ? t("auth.signupTitle") : t("auth.loginTitle")}
            </h1>
            <p className="mt-2 text-sm leading-6 text-steel">
              {isSignup ? t("auth.signupSubtitle") : t("auth.loginSubtitle")}
            </p>

            <form onSubmit={onSubmit} className="mt-7 space-y-3.5">
              {isSignup ? (
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold text-steel">{t("auth.nameLabel")}</span>
                  <div className="flex items-center gap-2 rounded-md border border-ink/15 bg-white/75 px-3 transition focus-within:border-accent/60 focus-within:ring-4 focus-within:ring-accent/10 dark:border-ink/25 dark:bg-ink/[0.08]">
                    <User size={16} className="shrink-0 text-steel" />
                    <input
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Ada Lovelace"
                      className="h-12 w-full bg-transparent text-sm font-semibold outline-none"
                    />
                  </div>
                </label>
              ) : null}

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-steel">{t("auth.emailLabel")}</span>
                <div className="flex items-center gap-2 rounded-md border border-ink/15 bg-white/75 px-3 transition focus-within:border-accent/60 focus-within:ring-4 focus-within:ring-accent/10 dark:border-ink/25 dark:bg-ink/[0.08]">
                  <Mail size={16} className="shrink-0 text-steel" />
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    className="h-12 w-full bg-transparent text-sm font-semibold outline-none"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-steel">{t("auth.passwordLabel")}</span>
                <div className="flex items-center gap-2 rounded-md border border-ink/15 bg-white/75 px-3 transition focus-within:border-accent/60 focus-within:ring-4 focus-within:ring-accent/10 dark:border-ink/25 dark:bg-ink/[0.08]">
                  <Lock size={16} className="shrink-0 text-steel" />
                  <input
                    required
                    type={showPassword ? "text" : "password"}
                    minLength={isSignup ? 8 : undefined}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={isSignup ? "At least 8 characters" : "Your password"}
                    className="h-12 w-full bg-transparent text-sm font-semibold outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="shrink-0 text-steel transition hover:text-ink"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>

              {error ? <p className="rounded-md bg-ember/10 px-3 py-2 text-xs font-semibold text-ember">{error}</p> : null}

              <Button disabled={loading} className="h-12 w-full accent-glow">
                {loading ? <Loader2 className="animate-spin" size={17} /> : <Sparkles size={16} />}
                {isSignup ? t("auth.signupButton") : t("auth.loginButton")}
              </Button>

              {!isSignup ? (
                <button
                  type="button"
                  onClick={enterDemo}
                  className="h-11 w-full rounded-md border border-ink/15 bg-transparent text-xs font-bold text-steel transition hover:border-ink/30 hover:text-ink dark:border-fog/15 dark:hover:border-fog/30"
                >
                  Skip sign-in — explore a live demo
                </button>
              ) : null}
            </form>

            <p className="mt-6 text-center text-xs text-steel">
              {isSignup ? (
                <>
                  {t("auth.alreadyAccount")}{" "}
                  <Link href="/login" className="font-bold text-ink hover:text-accent">
                    {t("auth.loginLink")}
                  </Link>
                </>
              ) : (
                <>
                  {t("auth.newHere")}{" "}
                  <Link href="/signup" className="font-bold text-ink hover:text-accent">
                    {t("auth.signupLink")}
                  </Link>
                </>
              )}
            </p>
          </div>

          <div className="executive-gradient relative hidden flex-col justify-between overflow-hidden p-8 text-fog lg:flex">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(246,244,238,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(246,244,238,0.06)_1px,transparent_1px)] bg-[size:36px_36px]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-[0.7rem] font-black backdrop-blur">
                <ShieldCheck size={14} className="text-accent" />
                Human approval mode
              </div>
              <h2 className="mt-5 text-2xl font-black leading-tight">
                A boardroom that challenges you back — before your money moves.
              </h2>
              <p
                className="mt-3 text-sm leading-6"
                style={{ color: "rgb(194 202 213 / 70%)" }}
              >
                Nine specialist agents pressure-test demand, guard runway, and scope the build — with a CEO holding
                it all to one weekly rhythm.
              </p>
            </div>

            <div className="relative grid grid-cols-2 gap-2.5">
              {SHOWCASE_AGENTS.map((name, index) => {
                const meta = agentMeta[name];
                const Icon = meta.icon;
                return (
                  <div
                    key={name}
                    className="animate-rise flex items-center gap-2.5 rounded-lg border border-white/10 bg-white/8 px-3 py-2.5 backdrop-blur"
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-white/10 text-accent">
                      <Icon size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black leading-none">{name}</p>
                      <p className="mt-1 text-[0.65rem] font-bold uppercase tracking-wide text-[rgb(152,162,175)]">{meta.orbit}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="relative text-[0.7rem] text-[rgb(152,162,175)]">No credit card required for the free trial.</p>
          </div>
        </div>
      </div>
    </main>
  );
}

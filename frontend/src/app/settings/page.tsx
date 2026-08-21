"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CreditCard,
  Download,
  Loader2,
  Lock,
  Trash2,
  User,
} from "lucide-react";
import { accountApi } from "@/lib/account";
import { billingApi, Subscription } from "@/lib/billing";
import { AuthUser, clearSession, getStoredUser, getToken } from "@/lib/auth";
import { toast, toastFromError } from "@/lib/toast";
import { Toaster } from "@/components/ui/toaster";
import { Logo } from "@/components/logo";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";

function SectionHead({
  icon: Icon,
  title,
  tone,
}: {
  icon: typeof User;
  title: string;
  tone?: "critical";
}) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon
        size={15}
        strokeWidth={1.75}
        className={tone === "critical" ? "text-critical" : "text-steel"}
      />
      <h2 className="text-sm font-bold tracking-tightest">{title}</h2>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }

    const stored = getStoredUser();
    setUser(stored);
    setName(stored?.name ?? "");

    billingApi.me().then(setSubscription).catch(() => undefined);
  }, [router]);

  async function saveName(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || savingName) return;

    setSavingName(true);
    try {
      const updated = await accountApi.updateProfile(name.trim());
      setUser(updated);
      window.localStorage.setItem("ceoai-auth-user", JSON.stringify(updated));
      toast.success("Name updated");
    } catch (error) {
      toastFromError(error, "Couldn't update your name");
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    if (newPassword.length < 8 || savingPassword) return;

    setSavingPassword(true);
    try {
      await accountApi.changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password changed", "We've emailed you a confirmation.");
    } catch (error) {
      toastFromError(error, "Couldn't change your password");
    } finally {
      setSavingPassword(false);
    }
  }

  async function exportData() {
    setExporting(true);
    try {
      const payload = await accountApi.exportData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);

      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ceoai-export-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);

      toast.success("Export downloaded");
    } catch (error) {
      toastFromError(error, "Couldn't export your data");
    } finally {
      setExporting(false);
    }
  }

  async function deleteAccount(event: FormEvent) {
    event.preventDefault();
    if (confirmation.trim().toUpperCase() !== "DELETE" || deleting) return;

    setDeleting(true);
    try {
      await accountApi.deleteAccount(deletePassword, confirmation.trim());
      clearSession();
      router.push("/");
    } catch (error) {
      toastFromError(error, "Couldn't delete your account");
      setDeleting(false);
    }
  }

  async function openPortal() {
    try {
      const { url } = await billingApi.portal();
      if (url) window.location.href = url;
    } catch (error) {
      toastFromError(error, "Billing portal unavailable");
    }
  }

  const usagePercent = subscription
    ? Math.min(
        100,
        (subscription.runs_used / Math.max(1, subscription.runs_included)) * 100,
      )
    : 0;

  return (
    <main
      id="main"
      data-surface="app"
      className="min-h-[100dvh] bg-radial-ui px-5 py-8 text-ink sm:px-8"
    >
      <div className="mx-auto w-full max-w-2xl">
        <nav className="flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-bold text-steel transition-colors duration-fast ease-out hover:text-ink"
          >
            <ArrowLeft size={15} strokeWidth={1.75} />
            Dashboard
          </Link>
          <Logo size={28} />
        </nav>

        <header className="mt-10">
          <p className="sec-eyebrow">Account</p>
          <h1 className="mt-3 font-display text-2xl tracking-tightest sm:text-3xl">
            Settings
          </h1>
          <p className="ui-card-desc">{user?.email}</p>
        </header>

        <div className="mt-8 space-y-4" data-stagger>
          {/* ---------------------------------------------------------- */}
          <Card style={{ "--i": 0 } as React.CSSProperties}>
            <SectionHead icon={User} title="Profile" />

            <form onSubmit={saveName}>
              <Field label="Display name">
                {(props) => (
                  <div className="flex flex-wrap gap-2">
                    <Input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="min-w-0 flex-1"
                      {...props}
                    />
                    <Button type="submit" disabled={savingName || !name.trim()}>
                      {savingName ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : null}
                      Save
                    </Button>
                  </div>
                )}
              </Field>
            </form>
          </Card>

          {/* ---------------------------------------------------------- */}
          <Card style={{ "--i": 1 } as React.CSSProperties}>
            <SectionHead icon={Lock} title="Password" />

            <form onSubmit={savePassword} className="space-y-3">
              <Field label="Current password">
                {(props) => (
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    {...props}
                  />
                )}
              </Field>

              <Field
                label="New password"
                hint="At least 8 characters."
                error={
                  newPassword && newPassword.length < 8
                    ? "Too short — use at least 8 characters."
                    : undefined
                }
              >
                {(props) => (
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    {...props}
                  />
                )}
              </Field>

              <Button
                type="submit"
                variant="ghost"
                disabled={
                  savingPassword || newPassword.length < 8 || !currentPassword
                }
              >
                {savingPassword ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : null}
                Change password
              </Button>
            </form>
          </Card>

          {/* ---------------------------------------------------------- */}
          <Card style={{ "--i": 2 } as React.CSSProperties}>
            <SectionHead icon={CreditCard} title="Plan" />

            {subscription ? (
              <>
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold">
                      {subscription.name}
                      <span className="ml-2 text-sm font-semibold text-steel tabular">
                        €{subscription.price_eur.toFixed(2)}/mo
                      </span>
                    </p>
                    <p className="ui-card-desc">
                      <AnimatedNumber value={subscription.runs_used} /> of{" "}
                      {subscription.runs_included} board runs used
                    </p>
                  </div>
                </div>

                <div
                  className="mt-3 h-1.5 overflow-hidden rounded-full bg-ink/10"
                  role="progressbar"
                  aria-valuenow={Math.round(usagePercent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Board runs used"
                >
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-slow ease-out"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link href="/pricing">
                    <Button variant="ghost" size="sm">
                      Compare plans
                    </Button>
                  </Link>
                  {subscription.manageable ? (
                    <Button variant="ghost" size="sm" onClick={openPortal}>
                      Manage billing
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-56" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            )}
          </Card>

          {/* ---------------------------------------------------------- */}
          <Card style={{ "--i": 3 } as React.CSSProperties}>
            <SectionHead icon={Download} title="Your data" />

            <p className="ui-card-desc">
              Download everything tied to this account as JSON: sessions,
              messages, reports, tasks, memories, and review settings.
            </p>

            <div className="mt-4">
              <Button variant="ghost" onClick={exportData} disabled={exporting}>
                {exporting ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Download size={14} strokeWidth={1.75} />
                )}
                Export my data
              </Button>
            </div>
          </Card>

          {/* ---------------------------------------------------------- */}
          <Card tone="critical" elev={1} style={{ "--i": 4 } as React.CSSProperties}>
            <SectionHead icon={Trash2} title="Delete account" tone="critical" />

            <p className="ui-card-desc">
              This removes your account and every session, report, task, and
              memory attached to it. It cannot be undone. Export your data first
              if you want a copy.
            </p>

            <div className="mt-4">
              <Button variant="ghost" onClick={() => setConfirmOpen(true)}>
                <Trash2 size={14} strokeWidth={1.75} />
                Delete my account
              </Button>
            </div>
          </Card>
        </div>

        <div className="h-16" />
      </div>

      {/* Destructive action moved behind a modal: the two inputs no longer sit
          on the page waiting to be filled in by accident. */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete your account?"
        description="Every session, report, task and memory goes with it. This cannot be undone."
      >
        <form onSubmit={deleteAccount} className="space-y-3">
          <Field label="Confirm your password">
            {(props) => (
              <Input
                type="password"
                autoComplete="current-password"
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                {...props}
              />
            )}
          </Field>

          <Field label="Type DELETE to confirm">
            {(props) => (
              <Input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder="DELETE"
                {...props}
              />
            )}
          </Field>

          <div className="ui-dialog-foot">
            <Button
              type="button"
              variant="quiet"
              onClick={() => setConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={
                deleting ||
                !deletePassword ||
                confirmation.trim().toUpperCase() !== "DELETE"
              }
            >
              {deleting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} strokeWidth={1.75} />
              )}
              Permanently delete
            </Button>
          </div>
        </form>
      </Dialog>

      <Toaster />
    </main>
  );
}

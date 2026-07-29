"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, Download, Loader2, Lock, Trash2, User } from "lucide-react";
import { accountApi } from "@/lib/account";
import { billingApi, Subscription } from "@/lib/billing";
import { AuthUser, clearSession, getStoredUser, getToken } from "@/lib/auth";
import { toast, toastFromError } from "@/lib/toast";
import { Toaster } from "@/components/ui/toaster";
import { Logo } from "@/components/logo";

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
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
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

  return (
    <main className="min-h-[100dvh] bg-radial-ui px-5 py-8 text-ink sm:px-8">
      <div className="mx-auto w-full max-w-2xl">
        <nav className="flex items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-[0.8rem] font-bold text-steel hover:text-ink dark:hover:text-fog"
          >
            <ArrowLeft size={15} />
            Dashboard
          </Link>
          <Logo size={28} />
        </nav>

        <header className="mt-10">
          <p className="sec-eyebrow">Account</p>
          <h1 className="mt-3 text-2xl font-bold tracking-[-0.02em] sm:text-3xl">Settings</h1>
          <p className="mt-2 text-[0.88rem] font-medium leading-7 text-steel">
            {user?.email}
          </p>
        </header>

        <section className="set-card mt-8">
          <div className="set-head">
            <User size={15} className="text-steel" />
            <h2 className="set-title">Profile</h2>
          </div>

          <form onSubmit={saveName} className="mt-4">
            <label htmlFor="name" className="sec-eyebrow">
              Display name
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="sec-input h-11 min-w-0 flex-1 rounded-md px-3 text-[0.88rem] font-semibold"
              />
              <button type="submit" disabled={savingName} className="err-btn err-btn-primary">
                {savingName ? <Loader2 size={14} className="animate-spin" /> : null}
                Save
              </button>
            </div>
          </form>
        </section>

        <section className="set-card mt-4">
          <div className="set-head">
            <Lock size={15} className="text-steel" />
            <h2 className="set-title">Password</h2>
          </div>

          <form onSubmit={savePassword} className="mt-4 space-y-3">
            <div>
              <label htmlFor="current" className="sec-eyebrow">
                Current password
              </label>
              <input
                id="current"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="sec-input mt-2 h-11 w-full rounded-md px-3 text-[0.88rem] font-semibold"
              />
            </div>

            <div>
              <label htmlFor="new" className="sec-eyebrow">
                New password
              </label>
              <input
                id="new"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="sec-input mt-2 h-11 w-full rounded-md px-3 text-[0.88rem] font-semibold"
              />
              <p className="mt-1.5 text-[0.72rem] font-semibold text-steel">
                At least 8 characters.
              </p>
            </div>

            <button
              type="submit"
              disabled={savingPassword || newPassword.length < 8 || !currentPassword}
              className="err-btn err-btn-primary disabled:opacity-50"
            >
              {savingPassword ? <Loader2 size={14} className="animate-spin" /> : null}
              Change password
            </button>
          </form>
        </section>

        <section className="set-card mt-4">
          <div className="set-head">
            <CreditCard size={15} className="text-steel" />
            <h2 className="set-title">Plan</h2>
          </div>

          {subscription ? (
            <>
              <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <p className="text-[1.05rem] font-bold">
                    {subscription.name}
                    <span className="ml-2 text-[0.8rem] font-semibold text-steel">
                      €{subscription.price_eur.toFixed(2)}/mo
                    </span>
                  </p>
                  <p className="mt-1 text-[0.78rem] font-semibold text-steel">
                    {subscription.runs_used} of {subscription.runs_included} board runs used
                  </p>
                </div>
              </div>

              <div className="sec-meter mt-3">
                <div
                  className="sec-meter-fill"
                  style={{
                    width: `${Math.min(
                      100,
                      (subscription.runs_used / Math.max(1, subscription.runs_included)) * 100,
                    )}%`,
                  }}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/pricing" className="err-btn">
                  Compare plans
                </Link>
                {subscription.manageable ? (
                  <button type="button" onClick={openPortal} className="err-btn">
                    Manage billing
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="sec-skel mt-4 h-9 w-40 rounded-md" />
          )}
        </section>

        <section className="set-card mt-4">
          <div className="set-head">
            <Download size={15} className="text-steel" />
            <h2 className="set-title">Your data</h2>
          </div>

          <p className="mt-3 text-[0.82rem] font-medium leading-7 text-steel">
            Download everything tied to this account as JSON: sessions, messages, reports, tasks,
            memories, and review settings.
          </p>

          <button type="button" onClick={exportData} disabled={exporting} className="err-btn mt-4">
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export my data
          </button>
        </section>

        <section className="set-card set-card-danger mt-4">
          <div className="set-head">
            <Trash2 size={15} className="text-ember" />
            <h2 className="set-title">Delete account</h2>
          </div>

          <p className="mt-3 text-[0.82rem] font-medium leading-7 text-steel">
            This removes your account and every session, report, task, and memory attached to it.
            It cannot be undone. Export your data first if you want a copy.
          </p>

          <form onSubmit={deleteAccount} className="mt-4 space-y-3">
            <input
              type="password"
              placeholder="Your password"
              autoComplete="current-password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              className="sec-input h-11 w-full rounded-md px-3 text-[0.88rem] font-semibold"
            />
            <input
              placeholder="Type DELETE to confirm"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="sec-input h-11 w-full rounded-md px-3 text-[0.88rem] font-semibold"
            />
            <button
              type="submit"
              disabled={
                deleting || !deletePassword || confirmation.trim().toUpperCase() !== "DELETE"
              }
              className="set-danger-btn"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Permanently delete
            </button>
          </form>
        </section>

        <div className="h-16" />
      </div>

      <Toaster />
    </main>
  );
}

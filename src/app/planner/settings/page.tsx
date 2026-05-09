"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getPlanLabel } from "@/lib/plans";
import Icon from "@/components/Icon";

// Price lookup by plan key
const PLAN_PRICES: Record<string, string> = {
  COUPLE_MONTHLY: "£2.99/mo",
  COUPLE_YEARLY: "£29.99/yr",
  PLANNER_BASIC_MONTHLY: "£7.99/mo",
  PLANNER_BASIC_YEARLY: "£79.99/yr",
  PLANNER_ADVANCED_MONTHLY: "£19.99/mo",
  PLANNER_ADVANCED_YEARLY: "£199.99/yr",
};

function getBillingCycle(plan: string): string {
  if (plan.endsWith("_YEARLY")) return "Yearly";
  if (plan.endsWith("_MONTHLY")) return "Monthly";
  return "N/A";
}

export default function PlannerSettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const router = useRouter();

  // Profile state
  const [profileName, setProfileName] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileToast, setProfileToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordToast, setPasswordToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState({
    emailRsvp: true,
    emailPayment: false,
    emailTasks: false,
    emailEvents: false,
    emailBudget: false,
  });

  // Load notification preferences from API
  useEffect(() => {
    fetch("/api/user/notification-prefs")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data) setNotifPrefs(data); })
      .catch(() => {});
  }, []);

  // Save notification preferences to API
  const updateNotifPref = (key: keyof typeof notifPrefs, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    fetch("/api/user/notification-prefs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    }).catch(() => {});
  };

  // Subscription state
  const [subLoading, setSubLoading] = useState(true);
  const [subPlan, setSubPlan] = useState<string | null>(null);
  const [subCurrentPeriodEnd, setSubCurrentPeriodEnd] = useState<string | null>(null);
  const [subCancelAtPeriodEnd, setSubCancelAtPeriodEnd] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingToast, setBillingToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Initialize profile name from session
  useEffect(() => {
    if (session?.user?.name) {
      setProfileName(session.user.name);
    }
  }, [session?.user?.name]);

  // Fetch subscription status
  useEffect(() => {
    fetch("/api/subscription/status")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setSubPlan(data.plan ?? null);
          setSubCurrentPeriodEnd(data.currentPeriodEnd ?? null);
          setSubCancelAtPeriodEnd(data.cancelAtPeriodEnd ?? false);
        }
      })
      .catch(() => {})
      .finally(() => setSubLoading(false));
  }, []);

  // Open Stripe billing portal
  const handleManageBilling = async () => {
    setBillingLoading(true);
    setBillingToast(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Couldn't open the billing portal.");
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("Couldn't open the billing portal — please try again.");
      }
    } catch (err) {
      setBillingToast({
        type: "error",
        message: (err as Error).message || "Couldn't open the billing portal. Try again or contact support.",
      });
      setBillingLoading(false);
    }
  };

  // Auto-dismiss toasts
  useEffect(() => {
    if (profileToast) {
      const t = setTimeout(() => setProfileToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [profileToast]);

  useEffect(() => {
    if (billingToast) {
      const t = setTimeout(() => setBillingToast(null), 6000);
      return () => clearTimeout(t);
    }
  }, [billingToast]);

  useEffect(() => {
    if (passwordToast) {
      const t = setTimeout(() => setPasswordToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [passwordToast]);

  // Save profile
  async function handleSaveProfile() {
    setProfileSaving(true);
    setProfileToast(null);
    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update profile");
      }
      await updateSession();
      setProfileToast({ type: "success", message: "Profile updated successfully" });
    } catch (err) {
      setProfileToast({ type: "error", message: (err as Error).message });
    } finally {
      setProfileSaving(false);
    }
  }

  // Change password
  const passwordsMatch = !confirmNewPassword || !newPassword || newPassword === confirmNewPassword;

  async function handleChangePassword() {
    if (newPassword !== confirmNewPassword) return;
    setPasswordSaving(true);
    setPasswordToast(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to change password");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setPasswordToast({ type: "success", message: "Password changed successfully" });
    } catch (err) {
      setPasswordToast({ type: "error", message: (err as Error).message });
    } finally {
      setPasswordSaving(false);
    }
  }

  // Delete account
  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete account");
      }
      await signOut({ callbackUrl: "/login" });
    } catch {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  // Toast component
  function Toast({ toast }: { toast: { type: "success" | "error"; message: string } | null }) {
    if (!toast) return null;
    return (
      <div
        className={`mt-3 px-4 py-2.5 rounded-xl text-sm font-label flex items-center gap-2 animate-fade-in ${
          toast.type === "success"
            ? "bg-primary-container/20 text-primary border border-primary/20"
            : "bg-error-container/20 text-error border border-error/20"
        }`}
      >
        <Icon name={toast.type === "success" ? "check_circle" : "error"} className="text-base" />
        {toast.message}
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      {/* ── Profile Section ── */}
      <section className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-6 sm:p-8 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-6">
          <Icon name="person" className="text-primary text-2xl" />
          <h2 className="font-headline text-xl text-on-surface">Profile</h2>
        </div>

        <div className="flex items-start gap-6">
          {/* Avatar placeholder */}
          <div className="hidden sm:flex w-20 h-20 rounded-full bg-primary-container/20 items-center justify-center flex-shrink-0">
            <Icon name="account_circle" className="text-primary text-4xl" />
          </div>

          <div className="flex-1 space-y-5">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={session?.user?.email ?? ""}
                readOnly
                className="w-full bg-transparent border-0 border-b border-outline-variant/50 pb-2 text-on-surface-variant font-body text-sm cursor-not-allowed opacity-60"
              />
              <p className="text-[10px] text-on-surface-variant/60 mt-1">Email cannot be changed</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveProfile}
            disabled={profileSaving || !profileName.trim()}
            className="gold-gradient text-on-primary font-label text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover-glow flex items-center gap-2 cursor-pointer"
          >
            {profileSaving && <Icon name="progress_activity" className="text-sm animate-spin" />}
            {profileSaving ? "Saving..." : "Save Profile"}
          </button>
        </div>
        <Toast toast={profileToast} />
      </section>

      {/* ── Password Section ── */}
      <section className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-6 sm:p-8 animate-fade-in-up delay-100">
        <div className="flex items-center gap-3 mb-6">
          <Icon name="lock" className="text-primary text-2xl" />
          <h2 className="font-headline text-xl text-on-surface">Change Password</h2>
        </div>

        <div className="space-y-5 max-w-md">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">
              New Password
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password (min 8 chars)"
              minLength={8}
              className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-2">
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              placeholder="Re-enter new password"
              minLength={8}
              className="w-full bg-transparent border-0 border-b border-outline-variant pb-2 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
            />
            {!passwordsMatch && (
              <p className="text-error text-xs mt-1.5 font-label">Passwords do not match</p>
            )}
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleChangePassword}
            disabled={passwordSaving || !currentPassword || !newPassword || newPassword.length < 8 || !passwordsMatch}
            className="gold-gradient text-on-primary font-label text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover-glow flex items-center gap-2 cursor-pointer"
          >
            {passwordSaving && <Icon name="progress_activity" className="text-sm animate-spin" />}
            {passwordSaving ? "Changing..." : "Change Password"}
          </button>
        </div>
        <Toast toast={passwordToast} />
      </section>

      {/* ── Notification Preferences ── */}
      <section className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-6 sm:p-8 animate-fade-in-up delay-200">
        <div className="flex items-center gap-3 mb-6">
          <Icon name="notifications" className="text-primary text-2xl" />
          <h2 className="font-headline text-xl text-on-surface">Notification Preferences</h2>
        </div>

        <div className="space-y-4">
          {([
            { key: "emailRsvp" as const, label: "RSVP Confirmations", desc: "Confirmation emails sent to guests when they RSVP" },
            { key: "emailPayment" as const, label: "Vendor Payment Reminders", desc: "Reminders when vendor payments are due within 7 days" },
            { key: "emailTasks" as const, label: "Task Reminders", desc: "Alerts when tasks are due within 24 hours" },
            { key: "emailEvents" as const, label: "Event Reminders", desc: "Reminders for upcoming wedding events within 7 days" },
            { key: "emailBudget" as const, label: "Budget Alerts", desc: "Alerts when spending reaches 80%, 90%, or 100% of your budget" },
          ]).map((item) => (
            <div key={item.key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-label text-on-surface font-medium">{item.label}</p>
                <p className="text-xs text-on-surface-variant/70">{item.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => updateNotifPref(item.key, !notifPrefs[item.key])}
                className={`relative w-12 h-7 rounded-full transition-colors duration-200 shrink-0 cursor-pointer ${
                  notifPrefs[item.key] ? "bg-primary" : "bg-outline-variant/40"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200 ${
                    notifPrefs[item.key] ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Subscription Section ── */}
      <section className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-6 sm:p-8 animate-fade-in-up delay-250">
        <div className="flex items-center gap-3 mb-6">
          <Icon name="card_membership" className="text-primary text-2xl" />
          <h2 className="font-headline text-xl text-on-surface">Subscription</h2>
        </div>

        {subLoading ? (
          <div className="flex items-center justify-center py-12">
            <Icon name="progress_activity" className="text-primary text-2xl animate-spin" />
          </div>
        ) : subPlan ? (
          <div className="space-y-4">
            {/* Plan name + badge */}
            <div className="flex items-center gap-3">
              <p className="text-sm font-label text-on-surface font-medium">{getPlanLabel(subPlan)}</p>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-label border ${
                  subCancelAtPeriodEnd
                    ? "bg-amber-500/15 text-amber-600 border-amber-500/20"
                    : "bg-primary/15 text-primary border-primary/20"
                }`}
              >
                {subCancelAtPeriodEnd ? "Cancelling" : "Active"}
              </span>
            </div>

            {/* Details rows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-1">
                  Billing Cycle
                </p>
                <p className="text-sm font-body text-on-surface">{getBillingCycle(subPlan)}</p>
              </div>

              <div>
                <p className="text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-1">
                  Price
                </p>
                <p className="text-sm font-body text-on-surface">{PLAN_PRICES[subPlan] ?? "N/A"}</p>
              </div>

              {subCurrentPeriodEnd && (
                <div>
                  <p className="text-[10px] uppercase tracking-widest font-label text-on-surface-variant mb-1">
                    {subCancelAtPeriodEnd ? "Cancels On" : "Next Renewal"}
                  </p>
                  <p className="text-sm font-body text-on-surface">
                    {new Date(subCurrentPeriodEnd).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleManageBilling}
                disabled={billingLoading}
                className="gold-gradient text-on-primary font-label text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed hover-glow flex items-center gap-2 cursor-pointer"
              >
                {billingLoading && (
                  <Icon name="progress_activity" className="text-sm animate-spin" />
                )}
                {billingLoading ? "Opening..." : "Manage Billing"}
              </button>

              <button
                onClick={() => router.push("/planner/subscription")}
                className="px-6 py-2.5 rounded-xl border border-outline-variant/30 text-on-surface-variant font-label text-xs uppercase tracking-widest hover:bg-surface-container-low active:scale-[0.97] transition-all cursor-pointer"
              >
                View Plans
              </button>
            </div>
            <Toast toast={billingToast} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <p className="text-sm font-label text-on-surface font-medium">Free Plan</p>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-label bg-outline-variant/15 text-on-surface-variant border border-outline-variant/20">
                Free
              </span>
            </div>

            <p className="text-sm text-on-surface-variant">
              You&apos;re on the free plan. Upgrade to unlock all features.
            </p>

            <div className="pt-2">
              <button
                onClick={() => router.push("/planner/subscription")}
                className="gold-gradient text-on-primary font-label text-xs uppercase tracking-widest px-6 py-2.5 rounded-xl hover:opacity-90 active:scale-[0.97] transition-all hover-glow flex items-center gap-2 cursor-pointer"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Danger Zone ── */}
      <section className="bg-surface-container-lowest rounded-2xl border border-error/20 ambient-shadow p-6 sm:p-8 animate-fade-in-up delay-300">
        <div className="flex items-center gap-3 mb-4">
          <Icon name="warning" className="text-error text-2xl" />
          <h2 className="font-headline text-xl text-error">Danger Zone</h2>
        </div>

        <p className="text-on-surface-variant text-sm mb-6">
          Once you delete your account, all of your data will be permanently removed. This action cannot be undone.
        </p>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-6 py-2.5 rounded-xl border border-error/30 text-error font-label text-xs uppercase tracking-widest hover:bg-error/10 active:scale-[0.97] transition-all cursor-pointer"
        >
          Delete Account
        </button>
      </section>

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl ghost-border ambient-shadow p-5 sm:p-8 w-full sm:max-w-md sm:mx-4 max-h-[85dvh] sm:max-h-[90vh] overflow-y-auto animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <Icon name="delete_forever" className="text-error text-2xl" />
              <h3 className="font-headline text-lg text-on-surface">Delete Account</h3>
            </div>

            <p className="text-on-surface-variant text-sm mb-3">
              This will permanently delete your planner account and all associated information.
            </p>

            <div className="bg-error-container/15 border border-error/20 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-2">
                <Icon name="priority_high" className="text-error text-base mt-0.5" />
                <p className="text-on-surface text-sm">
                  <span className="font-label font-semibold text-error">Warning:</span>{" "}
                  Any client weddings you own will also be permanently deleted, including all guests, vendors, budget entries, tasks, events, seating plans, and other related data. Your clients will lose access immediately.
                </p>
              </div>
            </div>

            <p className="text-on-surface-variant text-sm mb-3">
              Type <span className="font-mono text-error font-bold">DELETE</span> to confirm:
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full bg-transparent border-0 border-b border-error/30 pb-2 text-on-surface font-body text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus:border-error transition-colors mb-6"
            />

            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(""); }}
                className="px-5 py-2.5 rounded-xl text-on-surface-variant font-label text-xs uppercase tracking-widest hover:bg-surface-container-low transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== "DELETE" || deleting}
                className="px-5 py-2.5 rounded-xl bg-error text-white font-label text-xs uppercase tracking-widest hover:bg-error/90 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {deleting && <Icon name="progress_activity" className="text-sm animate-spin" />}
                {deleting ? "Deleting..." : "Delete Forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

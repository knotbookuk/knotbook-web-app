"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";

/* ─── Types ─── */

type StripeMode = "test" | "live";

/* ─── Plans data ─── */

const PLANS = [
  { name: "Personal", monthly: "£2.99", yearly: "£29.99" },
  { name: "Planner Basic", monthly: "£7.99", yearly: "£79.99" },
  { name: "Planner Advanced", monthly: "£19.99", yearly: "£199.99" },
];

const WEBHOOK_URL = "https://knotbook.co.uk/api/stripe/webhook";

const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
];

/* ─── Loading Skeleton ─── */

function LoadingSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center pl-16 pr-6 lg:px-6">
        <div className="w-40 h-6 bg-surface-container rounded animate-pulse" />
      </header>
      <main className="flex-1 p-6 bg-background">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <div className="bg-surface-container-lowest rounded-2xl ghost-border h-48 animate-pulse" />
          <div className="bg-surface-container-lowest rounded-2xl ghost-border h-64 animate-pulse" />
          <div className="bg-surface-container-lowest rounded-2xl ghost-border h-48 animate-pulse" />
        </div>
      </main>
    </div>
  );
}

/* ─── Component ─── */

export default function AdminStripePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [mode, setMode] = useState<StripeMode>("test");
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Redirect non-admin users
  useEffect(() => {
    if (session && session.user.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, router]);

  // Fetch current mode
  const fetchMode = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stripe");
      if (!res.ok) throw new Error("Failed to fetch Stripe settings");
      const data = await res.json();
      setMode(data.mode);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchMode();
    }
  }, [status, session, fetchMode]);

  // Toggle mode
  async function handleToggle() {
    const newMode: StripeMode = mode === "test" ? "live" : "test";

    if (newMode === "live") {
      const confirmed = confirm(
        "Are you sure you want to switch to LIVE mode?\n\nReal charges will be processed. Make sure all Stripe keys and webhooks are configured correctly."
      );
      if (!confirmed) return;
    }

    setToggling(true);
    try {
      const res = await fetch("/api/admin/stripe", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode }),
      });
      if (!res.ok) throw new Error("Failed to update mode");
      setMode(newMode);
      setSuccessMsg(
        newMode === "live"
          ? "Switched to LIVE mode successfully."
          : "Switched to TEST mode successfully."
      );
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setToggling(false);
    }
  }

  // Loading / auth guards
  if (status === "loading" || loading) return <LoadingSkeleton />;
  if (!session || session.user.role !== "ADMIN") return null;

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-surface-container-lowest rounded-2xl p-8 ghost-border text-center max-w-md">
          <Icon name="error" className="text-error text-4xl mb-3" />
          <h2 className="font-headline text-lg text-on-surface mb-2">Failed to load Stripe settings</h2>
          <p className="text-sm font-label text-on-surface-variant mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-label font-medium hover:bg-primary/90 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 page-enter">
      {/* Header */}
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center pl-16 pr-6 lg:px-6 sticky top-0 z-30">
        <h1 className="font-headline text-xl text-on-surface">Stripe Settings</h1>
      </header>

      {/* Content */}
      <div className="flex-1 p-6 bg-background overflow-y-auto">
        <div className="max-w-[1400px] mx-auto space-y-6">

          {/* Success Message */}
          {successMsg && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl px-5 py-4 animate-fade-in-up">
              <Icon name="check_circle" className="text-green-600 text-xl" />
              <p className="text-sm font-label font-medium text-green-800">{successMsg}</p>
            </div>
          )}

          {/* ─── Current Mode Card ─── */}
          <div className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div className="min-w-0">
                <h2 className="font-headline text-lg text-on-surface mb-1">Current Mode</h2>
                <p className="text-xs font-label text-on-surface-variant">
                  Control whether Stripe processes test or live transactions
                </p>
              </div>
              <span
                className={`text-xs font-label font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full self-start sm:self-auto shrink-0 ${
                  mode === "live"
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {mode === "live" ? "LIVE" : "TEST"}
              </span>
            </div>

            {/* Mode Banner */}
            {mode === "test" ? (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
                <Icon name="info" className="text-amber-600 text-xl mt-0.5" />
                <p className="text-sm font-label text-amber-800">
                  Test mode is active. No real charges will be made.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
                <Icon name="warning" className="text-red-600 text-xl mt-0.5" />
                <p className="text-sm font-label text-red-800">
                  Live mode is active. Real charges will be processed.
                </p>
              </div>
            )}

            <button
              onClick={handleToggle}
              disabled={toggling}
              className="gold-gradient text-white px-6 py-3 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer disabled:opacity-60 flex items-center gap-2"
            >
              {toggling && (
                <Icon name="progress_activity" className="text-sm animate-spin" />
              )}
              {toggling
                ? "Switching..."
                : mode === "test"
                ? "Switch to LIVE Mode"
                : "Switch to TEST Mode"}
            </button>
          </div>

          {/* ─── Price Overview Card ─── */}
          <div className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-6">
            <div className="mb-5">
              <h2 className="font-headline text-lg text-on-surface mb-1">Price Overview</h2>
              <p className="text-xs font-label text-on-surface-variant">
                Subscription pricing configured in Stripe
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-outline-variant/15">
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold">
                      Plan
                    </th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold">
                      Monthly
                    </th>
                    <th className="px-4 py-3 text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold">
                      Yearly
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PLANS.map((plan) => (
                    <tr
                      key={plan.name}
                      className="border-b border-outline-variant/10 last:border-b-0"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon name={plan.name === "Personal"
                                ? "favorite"
                                : plan.name === "Planner Basic"
                                ? "event_note"
                                : "diamond"} className="text-primary text-lg" />
                          </div>
                          <span className="text-sm font-label font-medium text-on-surface">
                            {plan.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-label text-on-surface">{plan.monthly}</span>
                        <span className="text-xs font-label text-on-surface-variant">/mo</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-sm font-label text-on-surface">{plan.yearly}</span>
                        <span className="text-xs font-label text-on-surface-variant">/yr</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── Webhook Status Card ─── */}
          <div className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-6">
            <div className="mb-5">
              <h2 className="font-headline text-lg text-on-surface mb-1">Webhook Status</h2>
              <p className="text-xs font-label text-on-surface-variant">
                Stripe webhook endpoint and subscribed events
              </p>
            </div>

            {/* Webhook URL */}
            <div className="mb-5">
              <p className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-2">
                Endpoint URL
              </p>
              <div className="flex items-center gap-3 bg-surface-container-low rounded-xl px-4 py-3">
                <Icon name="link" className="text-primary text-xl" />
                <code className="text-sm font-label text-on-surface break-all flex-1">
                  {WEBHOOK_URL}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(WEBHOOK_URL)}
                  className="p-1.5 rounded-lg hover:bg-surface-container transition-colors cursor-pointer shrink-0"
                  title="Copy URL"
                >
                  <Icon name="content_copy" className="text-on-surface-variant text-lg" />
                </button>
              </div>
            </div>

            {/* Events */}
            <div>
              <p className="text-xs uppercase tracking-wider text-on-surface-variant font-label font-semibold mb-3">
                Subscribed Events
              </p>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <span
                    key={event}
                    className="inline-flex items-center gap-1.5 text-xs font-label font-medium px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant"
                  >
                    <Icon name="check_circle" className="text-primary text-sm" />
                    {event}
                  </span>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

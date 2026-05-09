"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  subscription: { plan: string; status: string } | null;
  wedding: {
    id: string;
    partnerName1: string;
    partnerName2: string;
    weddingDate: string | null;
  } | null;
}

interface AdminData {
  totalUsers: number;
  activeSubscriptions: number;
  revenue: number;
  subscriptions: {
    couple: number;
    planner_basic: number;
    planner_advanced: number;
    legacy: number;
  };
  recentSignups: AdminUser[];
  allUsers: AdminUser[];
}

/* ─── Helpers ─── */

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function planLabel(plan: string): string {
  switch (plan) {
    case "COUPLE_MONTHLY":
      return "Personal · Monthly";
    case "COUPLE_YEARLY":
      return "Personal · Yearly";
    case "PLANNER_BASIC_MONTHLY":
      return "Planner Basic · Monthly";
    case "PLANNER_BASIC_YEARLY":
      return "Planner Basic · Yearly";
    case "PLANNER_ADVANCED_MONTHLY":
      return "Planner Advanced · Monthly";
    case "PLANNER_ADVANCED_YEARLY":
      return "Planner Advanced · Yearly";
    case "MONTHLY":
      return "Legacy Monthly";
    case "LIFETIME":
      return "Lifetime";
    default:
      return plan;
  }
}

function planBadge(user: AdminUser) {
  if (!user.subscription) {
    return (
      <span className="text-xs font-label font-medium px-2.5 py-1 rounded-full bg-surface-container text-on-surface-variant">
        Free
      </span>
    );
  }
  const plan = user.subscription.plan;
  const isPremium =
    plan === "LIFETIME" ||
    plan === "PLANNER_ADVANCED_MONTHLY" ||
    plan === "PLANNER_ADVANCED_YEARLY";
  return (
    <span
      className={`text-xs font-label font-medium px-2.5 py-1 rounded-full ${
        isPremium
          ? "bg-primary-container/20 text-primary"
          : "bg-surface-container text-on-surface-variant"
      }`}
    >
      {planLabel(plan)}
    </span>
  );
}

/* ─── Skeleton ─── */

function LoadingSkeleton() {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center pl-16 pr-6 lg:px-6">
        <div className="w-32 h-6 bg-surface-container rounded animate-pulse" />
      </header>
      <main className="flex-1 p-6 bg-background">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-surface-container-lowest rounded-2xl p-5 ghost-border h-32 animate-pulse"
              />
            ))}
          </div>
          <div className="bg-surface-container-lowest rounded-2xl ghost-border h-80 animate-pulse" />
        </div>
      </main>
    </div>
  );
}

/* ─── Component ─── */

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect non-admin users
  useEffect(() => {
    if (session && session.user.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [session, router]);

  // Fetch admin data
  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "ADMIN") return;

    async function fetchData() {
      try {
        const res = await fetch("/api/admin");
        if (!res.ok) {
          throw new Error(`Failed to fetch admin data (${res.status})`);
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [status, session]);

  // Show loading state
  if (status === "loading" || loading) {
    return <LoadingSkeleton />;
  }

  // Guard against non-admin
  if (!session || session.user.role !== "ADMIN") {
    return null;
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-surface-container-lowest rounded-2xl p-8 ghost-border text-center max-w-md">
          <Icon name="error" className="text-error text-4xl mb-3" />
          <h2 className="font-headline text-lg text-on-surface mb-2">
            Failed to load admin data
          </h2>
          <p className="text-sm font-label text-on-surface-variant mb-4">
            {error}
          </p>
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

  if (!data) return null;

  const totalSubs =
    data.subscriptions.couple +
    data.subscriptions.planner_basic +
    data.subscriptions.planner_advanced +
    data.subscriptions.legacy;
  const pct = (n: number) =>
    totalSubs > 0 ? Math.round((n / totalSubs) * 100) : 0;
  const couplePct = pct(data.subscriptions.couple);
  const basicPct = pct(data.subscriptions.planner_basic);
  const advancedPct = pct(data.subscriptions.planner_advanced);
  const legacyPct = pct(data.subscriptions.legacy);

  const metrics = [
    {
      label: "Total Users",
      value: data.totalUsers.toLocaleString(),
      icon: "group",
    },
    {
      label: "Active Subscriptions",
      value: data.activeSubscriptions.toLocaleString(),
      icon: "card_membership",
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-w-0 page-enter">
      {/* Top Header */}
      <header className="h-16 bg-surface-container-lowest border-b border-outline-variant/20 flex items-center pl-16 pr-6 lg:px-6 sticky top-0 z-30">
        <h1 className="font-headline text-xl text-on-surface">Dashboard</h1>
      </header>

      {/* Page Content */}
      <div className="flex-1 p-6 bg-background overflow-y-auto">
        <div className="max-w-[1400px] mx-auto space-y-6">
          {/* ─── Metrics Grid ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="bg-surface-container-lowest rounded-2xl p-5 ghost-border hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3">
                  <Icon name={metric.icon} className="text-primary/50 text-2xl" />
                </div>
                <p className="font-headline text-3xl text-on-surface">
                  {metric.value}
                </p>
                <p className="text-xs font-label text-on-surface-variant mt-1 uppercase tracking-wider">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>

          {/* ─── Two Column: Recent Signups + Subscription Breakdown ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {/* Recent Signups */}
            <div className="lg:col-span-4 bg-surface-container-lowest rounded-2xl ghost-border overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
                <div>
                  <h2 className="font-headline text-lg text-on-surface">
                    Recent Signups
                  </h2>
                  <p className="text-xs font-label text-on-surface-variant mt-0.5">
                    Latest user registrations
                  </p>
                </div>
                <Link
                  href="/admin/users"
                  className="text-xs font-label text-primary hover:text-primary/80 transition-colors font-medium cursor-pointer"
                >
                  View all users &rarr;
                </Link>
              </div>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-outline-variant/15">
                      <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                        Plan
                      </th>
                      <th className="px-6 py-3 text-[11px] font-label font-semibold text-on-surface-variant uppercase tracking-wider">
                        Signup Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentSignups.map((user, i) => (
                      <tr
                        key={user.id}
                        className={`border-b border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors ${
                          i === data.recentSignups.length - 1
                            ? "border-b-0"
                            : ""
                        }`}
                      >
                        <td className="px-6 py-3.5">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                          >
                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-label font-semibold text-primary">
                                {initials(user.name)}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <span className="text-sm font-label font-medium text-on-surface block truncate">
                                {user.name}
                              </span>
                              <span className="text-xs font-label text-on-surface-variant block truncate">
                                {user.email}
                              </span>
                            </div>
                          </Link>
                        </td>
                        <td className="px-6 py-3.5">{planBadge(user)}</td>
                        <td className="px-6 py-3.5 text-sm font-label text-on-surface-variant">
                          {formatDate(user.createdAt)}
                        </td>
                      </tr>
                    ))}
                    {data.recentSignups.length === 0 && (
                      <tr>
                        <td
                          colSpan={3}
                          className="px-6 py-8 text-center text-sm font-label text-on-surface-variant"
                        >
                          No users yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden p-3 space-y-3">
                {data.recentSignups.map((user) => (
                  <Link
                    key={user.id}
                    href={`/admin/users/${user.id}`}
                    className="block bg-surface-container-low/40 rounded-xl p-3 hover:bg-surface-container-low/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-[11px] font-label font-semibold text-primary">
                          {initials(user.name)}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-label font-medium text-on-surface truncate">
                          {user.name}
                        </p>
                        <p className="text-xs font-label text-on-surface-variant truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2.5">
                      {planBadge(user)}
                    </div>
                    <p className="text-xs font-label text-on-surface-variant mt-2">
                      {formatDate(user.createdAt)}
                    </p>
                  </Link>
                ))}
                {data.recentSignups.length === 0 && (
                  <p className="px-3 py-8 text-center text-sm font-label text-on-surface-variant">
                    No users yet.
                  </p>
                )}
              </div>
            </div>

            {/* Subscription Breakdown */}
            <div className="lg:col-span-3 bg-surface-container-lowest rounded-2xl p-6 ghost-border">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-headline text-lg text-on-surface">
                    Subscriptions
                  </h2>
                  <p className="text-xs font-label text-on-surface-variant mt-0.5">
                    Plan breakdown
                  </p>
                </div>
                <Icon name="pie_chart" className="text-primary/40" />
              </div>

              <div className="space-y-5">
                {/* Personal (Couple) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-label text-on-surface font-medium">
                      Personal
                    </span>
                    <span className="text-sm font-label text-on-surface-variant">
                      {data.subscriptions.couple} ({couplePct}%)
                    </span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-3 overflow-hidden">
                    <div
                      className="gold-gradient h-full rounded-full transition-all duration-700"
                      style={{ width: `${couplePct}%` }}
                    />
                  </div>
                </div>

                {/* Planner Basic */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-label text-on-surface font-medium">
                      Planner Basic
                    </span>
                    <span className="text-sm font-label text-on-surface-variant">
                      {data.subscriptions.planner_basic} ({basicPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-primary/60 h-full rounded-full transition-all duration-700"
                      style={{ width: `${basicPct}%` }}
                    />
                  </div>
                </div>

                {/* Planner Advanced */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-label text-on-surface font-medium">
                      Planner Advanced
                    </span>
                    <span className="text-sm font-label text-on-surface-variant">
                      {data.subscriptions.planner_advanced} ({advancedPct}%)
                    </span>
                  </div>
                  <div className="w-full bg-surface-container rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-primary h-full rounded-full transition-all duration-700"
                      style={{ width: `${advancedPct}%` }}
                    />
                  </div>
                </div>

                {/* Legacy (only show if any exist) */}
                {data.subscriptions.legacy > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-label text-on-surface-variant">
                        Legacy
                      </span>
                      <span className="text-sm font-label text-on-surface-variant">
                        {data.subscriptions.legacy} ({legacyPct}%)
                      </span>
                    </div>
                    <div className="w-full bg-surface-container rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-on-surface-variant/40 h-full rounded-full transition-all duration-700"
                        style={{ width: `${legacyPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="mt-6 pt-5 border-t border-outline-variant/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-label text-on-surface-variant">
                    Total Active
                  </span>
                  <span className="font-headline text-2xl text-primary">
                    {totalSubs}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

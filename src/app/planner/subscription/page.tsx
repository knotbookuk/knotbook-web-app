"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { formatCurrency } from "@/lib/format";
import { getPlanLabel, getPlanTier } from "@/lib/plans";
import Icon from "@/components/Icon";

/* ─── Types ─── */

interface StripePrices {
  COUPLE_MONTHLY: string;
  COUPLE_YEARLY: string;
  PLANNER_BASIC_MONTHLY: string;
  PLANNER_BASIC_YEARLY: string;
  PLANNER_ADVANCED_MONTHLY: string;
  PLANNER_ADVANCED_YEARLY: string;
}

interface StripeConfig {
  publishableKey: string;
  mode: "test" | "live";
  prices: StripePrices;
}

interface PlanDef {
  name: string;
  icon: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyKey: keyof StripePrices;
  yearlyKey: keyof StripePrices;
  badge?: string;
  features: string[];
  extras?: string[];
  tierKey: "planner_basic" | "planner_advanced";
}

interface SubscriptionStatus {
  plan: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

/* ─── Plan Data (Planner tiers only) ─── */

const PLANS: PlanDef[] = [
  {
    name: "Planner Basic",
    icon: "description",
    monthlyPrice: 7.99,
    yearlyPrice: 79.99,
    monthlyKey: "PLANNER_BASIC_MONTHLY",
    yearlyKey: "PLANNER_BASIC_YEARLY",
    badge: "Popular",
    tierKey: "planner_basic",
    features: [
      "Everything in Personal, plus:",
      "Allergy & dietary tracking",
      "Beauty trial scheduling",
      "Inspiration gallery",
      "Advanced export options",
      "Email support",
    ],
  },
  {
    name: "Planner Advanced",
    icon: "workspace_premium",
    monthlyPrice: 19.99,
    yearlyPrice: 199.99,
    monthlyKey: "PLANNER_ADVANCED_MONTHLY",
    yearlyKey: "PLANNER_ADVANCED_YEARLY",
    tierKey: "planner_advanced",
    features: [
      "Everything in Planner Basic, plus:",
      "Priority email support",
      "AI-powered suggestions (coming soon)",
      "Custom wedding website (coming soon)",
      "Advanced analytics & insights",
      "PDF export with branding",
      "Early access to new features",
    ],
  },
];

/* ─── Helpers ─── */

/** Map user's plan string to a tier key that matches our PlanDef tierKey */
function getUserTierKey(plan: string | null | undefined): string | null {
  const tier = getPlanTier(plan);
  if (tier === "free") return null;
  return tier;
}

function isYearlyPlan(plan: string | null | undefined): boolean {
  return !!plan && plan.includes("YEARLY");
}

function formatPeriodEnd(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/* ─── Skeleton ─── */

function SubscriptionSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <div className="h-10 w-64 rounded-xl bg-surface-container-low animate-pulse" />
        <div className="mt-2 h-4 w-80 rounded-lg bg-surface-container-low animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-[520px] rounded-3xl bg-surface-container-low animate-pulse"
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Component ─── */

export default function PlannerSubscriptionPage() {
  return (
    <Suspense fallback={<SubscriptionSkeleton />}>
      <SubscriptionContent />
    </Suspense>
  );
}

function SubscriptionContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const planCardsRef = useRef<HTMLDivElement>(null);

  const [config, setConfig] = useState<StripeConfig | null>(null);
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [yearly, setYearly] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // Prefer the live status response (has cancelAtPeriodEnd + currentPeriodEnd) but fall back to session
  const userPlan = status?.plan ?? session?.user?.plan ?? null;
  const userTier = getUserTierKey(userPlan);
  const hasPaidPlan = userTier !== null;
  const cancelAtPeriodEnd = status?.cancelAtPeriodEnd ?? false;
  const periodEndLabel = formatPeriodEnd(status?.currentPeriodEnd ?? null);

  const isSuccess = searchParams.get("success") === "true";
  const isCancelled = searchParams.get("cancelled") === "true";

  /* Fetch Stripe config + subscription status on mount */
  useEffect(() => {
    Promise.all([
      fetch("/api/stripe/config").then((r) => {
        if (!r.ok) throw new Error("Failed to load config");
        return r.json() as Promise<StripeConfig>;
      }),
      fetch("/api/subscription/status")
        .then((r) => (r.ok ? (r.json() as Promise<SubscriptionStatus>) : null))
        .catch(() => null),
    ])
      .then(([cfg, st]) => {
        setConfig(cfg);
        if (st) setStatus(st);
        setLoading(false);
        requestAnimationFrame(() => setVisible(true));
      })
      .catch(() => {
        setError("Unable to load subscription information. Please try again later.");
        setLoading(false);
        requestAnimationFrame(() => setVisible(true));
      });
  }, []);

  /* Scroll to plans when "Change Plan" is clicked */
  useEffect(() => {
    if (showPlans && planCardsRef.current) {
      planCardsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showPlans]);

  /* ─── Handlers ─── */

  async function handleCheckout(plan: PlanDef) {
    if (!config) return;
    const priceId = yearly ? config.prices[plan.yearlyKey] : config.prices[plan.monthlyKey];
    const key = yearly ? plan.yearlyKey : plan.monthlyKey;
    setCheckoutLoading(key);
    setError(null);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          successUrl: "/planner/subscription?success=true",
          cancelUrl: "/planner/subscription?cancelled=true",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Checkout failed");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      setError((err as Error).message);
      setCheckoutLoading(null);
    }
  }

  async function handleManageBilling() {
    setPortalLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not open billing portal");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (err) {
      setError((err as Error).message);
      setPortalLoading(false);
    }
  }

  /* ─── Loading Skeleton ─── */

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="h-10 w-64 rounded-xl bg-surface-container-low animate-pulse" />
          <div className="mt-2 h-4 w-80 rounded-lg bg-surface-container-low animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto gap-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-[520px] rounded-3xl bg-surface-container-low animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  /* ─── Error State ─── */

  if (error && !config) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="font-headline text-4xl md:text-5xl text-on-surface">
            Subscription
          </h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <Icon name="error" className="text-red-500 text-3xl mb-2 block" />
          <p className="text-sm text-red-700 font-label">{error}</p>
        </div>
      </div>
    );
  }

  /* ─── Plan Cards Renderer ─── */

  function renderPlanCards(contextHasPlan: boolean) {
    return (
      <div
        ref={contextHasPlan ? planCardsRef : undefined}
        className="grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto gap-6"
      >
        {PLANS.map((plan) => {
          const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
          const period = yearly ? "/yr" : "/mo";
          const priceKey = yearly ? plan.yearlyKey : plan.monthlyKey;
          const isCurrentPlan = contextHasPlan && userTier === plan.tierKey;

          // Determine button label
          let buttonLabel = "Get Started";
          if (contextHasPlan) {
            if (isCurrentPlan) {
              buttonLabel = "Current Plan";
            } else {
              const tierOrder = ["planner_basic", "planner_advanced"];
              const currentIdx = tierOrder.indexOf(userTier!);
              const planIdx = tierOrder.indexOf(plan.tierKey);
              buttonLabel = planIdx > currentIdx ? "Upgrade" : "Downgrade";
            }
          }

          return (
            <div
              key={plan.name}
              className={`relative rounded-3xl p-6 md:p-8 ghost-border transition-all ${
                plan.badge ? "ring-2 ring-primary/30" : ""
              } ${
                isCurrentPlan ? "ring-2 ring-primary/40" : ""
              } bg-surface-container-lowest ambient-shadow`}
            >
              {/* Badge */}
              {plan.badge && !isCurrentPlan && (
                <span className="absolute top-4 right-4 px-3 py-1 rounded-full gold-gradient text-white text-xs font-label font-semibold uppercase tracking-wider">
                  {plan.badge}
                </span>
              )}
              {isCurrentPlan && (
                <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-green-100 text-green-800 text-xs font-label font-semibold uppercase tracking-wider">
                  Current
                </span>
              )}

              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl gold-gradient flex items-center justify-center shadow-lg mb-4">
                <Icon name={plan.icon} className="text-white text-xl" />
              </div>

              {/* Plan Name */}
              <h3 className="font-headline text-2xl text-on-surface">
                {plan.name}
              </h3>

              {/* Price */}
              <div className="mt-3 mb-6">
                <span className="font-headline text-4xl text-on-surface">
                  {formatCurrency(price)}
                </span>
                <span className="text-on-surface-variant font-label text-sm">
                  {period}
                </span>
                {yearly && (
                  <p className="text-xs text-on-surface-variant/70 font-label mt-1">
                    Save {formatCurrency(plan.monthlyPrice * 12 - plan.yearlyPrice)} per year
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2.5 mb-8">
                {plan.features.map((feature) => {
                  const isHeader = feature.endsWith("plus:");
                  return (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Icon name={isHeader ? "arrow_upward" : "check_circle"} className={`text-lg mt-0.5 ${
                          isHeader ? "text-primary/60" : "text-primary"
                        }`} />
                      <span
                        className={`text-sm ${
                          isHeader
                            ? "text-on-surface-variant/70 font-medium italic"
                            : "text-on-surface-variant"
                        }`}
                      >
                        {feature}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {/* CTA Button */}
              {isCurrentPlan ? (
                <button
                  disabled
                  className="w-full py-3.5 rounded-full border-2 border-outline-variant/40 text-sm font-label font-semibold text-on-surface-variant disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Current Plan
                </button>
              ) : (
                <button
                  onClick={() => handleCheckout(plan)}
                  disabled={checkoutLoading !== null}
                  className="w-full gold-gradient text-white py-3.5 rounded-full font-label text-sm font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {checkoutLoading === priceKey ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    buttonLabel
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  /* ─── Main Render ─── */

  return (
    <div
      className={`space-y-8 transition-opacity duration-500 ease-out ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Success / Cancelled Banners */}
      {isSuccess && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-2xl p-4">
          <Icon name="celebration" className="text-green-600 text-xl" />
          <p className="text-sm text-green-800 font-label">
            Your subscription is now active! Welcome aboard.
          </p>
        </div>
      )}

      {isCancelled && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <Icon name="info" className="text-amber-600 text-xl" />
          <p className="text-sm text-amber-800 font-label">
            Checkout was cancelled. No charges were made.
          </p>
        </div>
      )}

      {/* Inline error */}
      {error && config && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
          <Icon name="error" className="text-red-500 text-xl" />
          <p className="text-sm text-red-700 font-label">{error}</p>
        </div>
      )}

      {/* Test mode banner */}
      {config?.mode === "test" && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <Icon name="science" className="text-yellow-600 text-xl" />
          <p className="text-sm text-yellow-800 font-label">
            Test mode &mdash; no real charges will be made.
          </p>
        </div>
      )}

      {/* ────────────────────────────────────────
          ACTIVE PLAN VIEW
      ──────────────────────────────────────── */}
      {hasPaidPlan ? (
        <>
          {/* Header */}
          <div>
            <h1 className="font-headline text-4xl md:text-5xl text-on-surface">
              Your Plan
            </h1>
            <p className="mt-1 text-sm text-on-surface-variant font-label">
              Manage your subscription and billing details
            </p>
          </div>

          {/* Current Plan Card */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 ambient-shadow ghost-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl gold-gradient flex items-center justify-center shadow-lg">
                  <Icon name="workspace_premium" className="text-white text-2xl" />
                </div>
                <div>
                  <h2 className="font-headline text-xl text-on-surface">
                    {getPlanLabel(userPlan)}
                  </h2>
                  <p className="text-sm text-on-surface-variant font-label">
                    {cancelAtPeriodEnd && periodEndLabel
                      ? `Active until ${periodEndLabel}`
                      : session?.user?.name
                      ? `Welcome, ${session.user.name}`
                      : "Manage your subscription"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {cancelAtPeriodEnd ? (
                  <span className="px-4 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-label font-semibold uppercase tracking-wider">
                    {periodEndLabel ? `Active until ${periodEndLabel}` : "Cancelling"}
                  </span>
                ) : (
                  <span className="px-4 py-1.5 rounded-full bg-green-100 text-green-800 text-xs font-label font-semibold uppercase tracking-wider">
                    Active
                  </span>
                )}
                <span className="font-headline text-2xl text-primary">
                  {(() => {
                    const match = PLANS.find((p) => p.tierKey === userTier);
                    if (!match) return null;
                    const isYearly = isYearlyPlan(userPlan);
                    const price = isYearly ? match.yearlyPrice : match.monthlyPrice;
                    const suffix = isYearly ? "/yr" : "/mo";
                    return (
                      <>
                        {formatCurrency(price)}
                        <span className="text-sm text-on-surface-variant font-label">
                          {suffix}
                        </span>
                      </>
                    );
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="px-8 py-3 rounded-full gold-gradient text-white text-sm font-label font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {portalLoading ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Opening...
                </>
              ) : (
                <>
                  <Icon name="settings" className="text-lg" />
                  Manage Billing
                </>
              )}
            </button>

            <button
              onClick={() => setShowPlans((v) => !v)}
              className="px-6 py-3 rounded-full border-2 border-outline-variant/40 text-sm font-label font-semibold text-on-surface-variant hover:border-primary/40 hover:text-primary transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Icon name={showPlans ? "expand_less" : "swap_vert"} className="text-lg" />
              {showPlans ? "Hide Plans" : "Change Plan"}
            </button>
          </div>

          {/* Plan Comparison (toggled) */}
          {showPlans && (
            <div className="space-y-6">
              {/* Billing Toggle */}
              <div className="flex items-center justify-center gap-3">
                <span
                  className={`text-sm font-label font-medium transition-colors ${
                    !yearly ? "text-on-surface" : "text-on-surface-variant"
                  }`}
                >
                  Monthly
                </span>
                <button
                  onClick={() => setYearly((v) => !v)}
                  className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
                    yearly ? "bg-primary" : "bg-outline-variant/40"
                  }`}
                  aria-label="Toggle billing period"
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                      yearly ? "translate-x-7" : "translate-x-0"
                    }`}
                  />
                </button>
                <span
                  className={`text-sm font-label font-medium transition-colors ${
                    yearly ? "text-on-surface" : "text-on-surface-variant"
                  }`}
                >
                  Yearly
                </span>
                {yearly && (
                  <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-label font-semibold">
                    Save up to 17%
                  </span>
                )}
              </div>

              {renderPlanCards(true)}
            </div>
          )}
        </>
      ) : (
        /* ────────────────────────────────────────
           NO PLAN — PRICING PAGE
        ──────────────────────────────────────── */
        <>
          {/* Header */}
          <div className="text-center">
            <h1 className="font-headline text-4xl md:text-5xl text-on-surface">
              Choose Your Plan
            </h1>
            <p className="mt-2 text-sm text-on-surface-variant font-label max-w-lg mx-auto">
              Unlock the full planner toolkit and manage every wedding from one place. Pick the plan that suits your business.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3">
            <span
              className={`text-sm font-label font-medium transition-colors ${
                !yearly ? "text-on-surface" : "text-on-surface-variant"
              }`}
            >
              Monthly
            </span>
            <button
              onClick={() => setYearly((v) => !v)}
              className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
                yearly ? "bg-primary" : "bg-outline-variant/40"
              }`}
              aria-label="Toggle billing period"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${
                  yearly ? "translate-x-7" : "translate-x-0"
                }`}
              />
            </button>
            <span
              className={`text-sm font-label font-medium transition-colors ${
                yearly ? "text-on-surface" : "text-on-surface-variant"
              }`}
            >
              Yearly
            </span>
            {yearly && (
              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-label font-semibold">
                Save up to 17%
              </span>
            )}
          </div>

          {/* Plan Cards */}
          {renderPlanCards(false)}
        </>
      )}
    </div>
  );
}

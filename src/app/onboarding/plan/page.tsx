"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Icon from "@/components/Icon";
import Image from "next/image";

/* ─── Plan Data ─── */

interface PlanOption {
  name: string;
  icon: string;
  monthlyPrice: number;
  yearlyPrice: number;
  monthlyKey: string;
  yearlyKey: string;
  badge?: string;
  features: string[];
  forUserType: "COUPLE" | "PLANNER" | "ALL";
  isFree?: boolean;
}

const allPlans: PlanOption[] = [
  {
    name: "Free",
    icon: "spa",
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyKey: "",
    yearlyKey: "",
    forUserType: "ALL",
    isFree: true,
    features: [
      "Dashboard & wedding countdown",
      "Budget tracking & reports",
      "Checklist management",
      "Settings & profile",
      "Feedback & support",
    ],
  },
  {
    name: "Personal",
    icon: "favorite",
    monthlyPrice: 2.99,
    yearlyPrice: 29.99,
    monthlyKey: "COUPLE_MONTHLY",
    yearlyKey: "COUPLE_YEARLY",
    badge: "Recommended",
    forUserType: "COUPLE",
    features: [
      "Everything in Free, plus:",
      "Guest list & seating planner",
      "Vendor management",
      "Wedding day timeline",
      "Task management",
      "Outfit & mood board",
      "Menu & catering planning",
      "Export to CSV",
    ],
  },
  {
    name: "Planner Basic",
    icon: "description",
    monthlyPrice: 7.99,
    yearlyPrice: 79.99,
    monthlyKey: "PLANNER_BASIC_MONTHLY",
    yearlyKey: "PLANNER_BASIC_YEARLY",
    badge: "Popular",
    forUserType: "PLANNER",
    features: [
      "Everything in Free, plus:",
      "Multi-client management",
      "Guest list & seating planner",
      "Vendor management",
      "Allergy & dietary tracking",
      "Beauty trial scheduling",
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
    forUserType: "PLANNER",
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

/* ─── Component ─── */

function OnboardingPlanForm() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [yearly, setYearly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});

  // Fetch Stripe price IDs
  useEffect(() => {
    async function fetchConfig() {
      try {
        const res = await fetch("/api/stripe/config");
        if (res.ok) {
          const data = await res.json();
          setPrices(data.prices || {});
        }
      } catch {
        // Silently fail — buttons will be disabled without prices
      }
    }
    fetchConfig();
  }, []);

  // If user already has a plan, skip to dashboard
  useEffect(() => {
    if (status === "authenticated" && session?.user?.plan) {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  // Filter plans based on userType
  const userType = session?.user?.userType || "COUPLE";
  const plans = allPlans.filter(
    (p) => p.forUserType === "ALL" || p.forUserType === userType,
  );

  const handleSelectPlan = async (plan: PlanOption) => {
    const key = yearly ? plan.yearlyKey : plan.monthlyKey;
    const priceId = prices[key];

    if (!priceId) return;

    setLoading(true);
    setLoadingPlan(plan.name);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          successUrl: "/subscription-success",
          cancelUrl: "/onboarding/plan",
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setLoading(false);
        setLoadingPlan(null);
      }
    } catch {
      setLoading(false);
      setLoadingPlan(null);
    }
  };

  const handleSkip = async () => {
    await update(); // refresh JWT with new userType
    // Small delay to let session propagate
    window.location.href = session?.user?.userType === "PLANNER" ? "/planner" : "/dashboard";
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen linen-texture flex items-center justify-center">
        <Icon name="progress_activity" className="text-primary text-4xl animate-spin" />
      </div>
    );
  }

  return (
    <div className="linen-texture min-h-screen relative overflow-hidden flex flex-col">
      {/* Decorative Corner Accents */}
      <div
        aria-hidden="true"
        className="fixed -top-20 -left-20 w-72 h-72 rounded-full bg-primary-container/10 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="fixed -top-20 -right-20 w-72 h-72 rounded-full bg-primary-container/10 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="fixed -bottom-20 -left-20 w-96 h-96 rounded-full bg-primary-container/8 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="fixed -bottom-20 -right-20 w-96 h-96 rounded-full bg-primary-container/8 blur-3xl pointer-events-none"
      />

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl text-center">
          {/* Logo */}
          <Image src="/images/knotbook-logo-full.png"
            alt="KnotBook"
            className="h-28 w-auto mx-auto mb-6" width={600} height={600} />

          {/* Divider */}
          <div className="w-12 h-[1px] bg-outline-variant mx-auto mb-10" />

          {/* Headline */}
          <h2 className="font-headline italic text-4xl md:text-5xl text-on-surface mb-4">
            Choose your plan
          </h2>
          <p className="text-on-surface-variant font-light text-base md:text-lg mb-8 max-w-lg mx-auto">
            Unlock the full power of KnotBook, or start for free and upgrade
            anytime.
          </p>

          {/* Monthly / Yearly toggle */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <span
              className={`text-sm font-medium transition-colors ${
                !yearly ? "text-on-surface" : "text-on-surface-variant"
              }`}
            >
              Monthly
            </span>
            <button
              onClick={() => setYearly(!yearly)}
              className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${
                yearly ? "bg-primary" : "bg-outline-variant/40"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  yearly ? "translate-x-7" : "translate-x-0"
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium transition-colors ${
                yearly ? "text-on-surface" : "text-on-surface-variant"
              }`}
            >
              Yearly
            </span>
            {yearly && (
              <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                Save up to 17%
              </span>
            )}
          </div>

          {/* Plan Cards */}
          <div className={`grid gap-6 ${plans.length === 2 ? "md:grid-cols-2 max-w-3xl mx-auto" : "md:grid-cols-3 max-w-5xl mx-auto"}`}>
            {plans.map((plan) => {
              const isHighlighted = !!plan.badge;
              const isLoading = loadingPlan === plan.name;
              const isFree = !!plan.isFree;

              return (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl p-8 flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${
                    isHighlighted
                      ? "gold-gradient pt-10"
                      : "bg-surface-container-lowest ghost-border"
                  }`}
                >
                  {/* Badge */}
                  {plan.badge && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                      <span className="bg-white text-primary text-xs font-bold px-5 py-2 rounded-full shadow-lg whitespace-nowrap">
                        {plan.badge}
                      </span>
                    </div>
                  )}

                  {/* Icon + Name */}
                  <div className="flex items-center gap-2.5 mb-1">
                    <Icon name={plan.icon} className={`text-2xl ${
                        isHighlighted ? "text-white" : "text-primary"
                      }`} />
                    <h3
                      className={`font-headline text-2xl ${
                        isHighlighted ? "text-white" : "text-on-surface"
                      }`}
                    >
                      {plan.name}
                    </h3>
                  </div>

                  {/* Price */}
                  <div className="mb-6 mt-4 text-left">
                    {isFree ? (
                      <>
                        <span className="font-headline text-4xl text-on-surface">
                          Free
                        </span>
                        <p className="text-xs mt-1 text-on-surface-variant">
                          No subscription required
                        </p>
                      </>
                    ) : (
                      <>
                        <span
                          className={`font-headline text-4xl ${
                            isHighlighted ? "text-white" : "text-on-surface"
                          }`}
                        >
                          &pound;
                          {yearly
                            ? plan.yearlyPrice.toFixed(2)
                            : plan.monthlyPrice.toFixed(2)}
                        </span>
                        <span
                          className={`text-sm ${
                            isHighlighted ? "text-white/80" : "text-on-surface-variant"
                          }`}
                        >
                          /{yearly ? "year" : "month"}
                        </span>
                        {yearly && (
                          <p
                            className={`text-xs mt-1 ${
                              isHighlighted
                                ? "text-white/70"
                                : "text-on-surface-variant"
                            }`}
                          >
                            &pound;{(plan.yearlyPrice / 12).toFixed(2)}/month
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2.5 mb-8 flex-1 text-left">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Icon name="check_circle" className={`text-base mt-0.5 ${
                            isHighlighted ? "text-white" : "text-primary"
                          }`} />
                        <span
                          className={`text-sm ${
                            isHighlighted
                              ? "text-white/90"
                              : "text-on-surface-variant"
                          }`}
                        >
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isFree ? (
                    <button
                      onClick={handleSkip}
                      disabled={loading}
                      className="block w-full text-center font-semibold px-6 py-3 rounded-full ghost-border bg-surface-container-lowest text-on-surface hover:border-primary/40 transition-all cursor-pointer disabled:opacity-50"
                    >
                      Start Free
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={loading}
                      className={`block w-full text-center font-semibold px-6 py-3 rounded-full transition-all cursor-pointer disabled:opacity-50 ${
                        isHighlighted
                          ? "bg-white text-primary shadow-lg hover:shadow-xl"
                          : "ghost-border bg-surface-container-lowest text-on-surface hover:border-primary/40"
                      }`}
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center gap-2">
                          <Icon name="progress_activity" className="text-lg animate-spin" />
                          Redirecting...
                        </span>
                      ) : (
                        "Get Started"
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Step Indicator */}
          <p className="mt-6 text-on-surface-variant/60 italic font-headline text-sm">
            Step 3 of 3
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6">
        <p className="text-on-surface-variant/40 text-xs font-light tracking-wide">
          KnotBook &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}

export default function OnboardingPlanPage() {
  return (
    <Suspense>
      <OnboardingPlanForm />
    </Suspense>
  );
}

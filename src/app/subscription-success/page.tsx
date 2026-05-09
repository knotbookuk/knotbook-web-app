"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getPlanLabel } from "@/lib/plans";
import Icon from "@/components/Icon";
import Image from "next/image";

export default function SubscriptionSuccessPage() {
  const { data: session } = useSession();
  const [planReady, setPlanReady] = useState(false);
  const [detectedPlan, setDetectedPlan] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(5);
  const [dots, setDots] = useState("");

  // Poll the DB directly for subscription status (bypasses JWT staleness)
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20; // 20 × 2s = 40s max
    let cancelled = false;

    const poll = async () => {
      while (attempts < maxAttempts && !cancelled) {
        attempts++;
        try {
          const res = await fetch("/api/subscription/status");
          const data = await res.json();
          if (data.plan) {
            // Plan found in DB — store it locally for display
            // The JWT will auto-pick this up on next page load via the
            // auth.ts "no plan" catch-up check
            setDetectedPlan(data.plan);
            setPlanReady(true);
            return;
          }
        } catch {
          // Network error, keep retrying
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      // Timed out — let them proceed anyway (JWT catch-up will handle it on next load)
      setPlanReady(true);
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Animate dots while waiting
  useEffect(() => {
    if (planReady) return;
    const timer = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "" : d + "."));
    }, 500);
    return () => clearInterval(timer);
  }, [planReady]);

  // Countdown to redirect once plan is ready
  useEffect(() => {
    if (!planReady) return;
    if (countdown <= 0) {
      const destination =
        session?.user?.userType === "PLANNER" ? "/planner" : "/dashboard";
      window.location.replace(destination);
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [planReady, countdown, session?.user?.userType]);

  const planLabel = getPlanLabel(detectedPlan || session?.user?.plan);
  const isPlanner = session?.user?.userType === "PLANNER";
  const destination = isPlanner ? "/planner" : "/dashboard";

  return (
    <div className="linen-texture min-h-screen flex items-center justify-center px-6">
      {/* Decorative accents */}
      <div
        aria-hidden="true"
        className="fixed -top-20 -left-20 w-72 h-72 rounded-full bg-primary-container/10 blur-3xl pointer-events-none"
      />
      <div
        aria-hidden="true"
        className="fixed -bottom-20 -right-20 w-96 h-96 rounded-full bg-primary-container/8 blur-3xl pointer-events-none"
      />

      <div className="w-full max-w-lg text-center">
        {/* Logo */}
        <Image src="/images/knotbook-logo-nav.png"
          alt="KnotBook"
          className="h-20 w-auto mx-auto mb-8" width={400} height={400} />

        {!planReady ? (
          /* ─── Waiting for webhook ─── */
          <div className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-10">
            <div className="w-16 h-16 rounded-full gold-gradient flex items-center justify-center mx-auto mb-6">
              <Icon name="progress_activity" className="text-white text-3xl animate-spin" />
            </div>
            <h1 className="font-headline italic text-3xl text-on-surface mb-3">
              Setting up your plan{dots}
            </h1>
            <p className="text-on-surface-variant font-light text-base">
              We&apos;re confirming your payment and activating your
              subscription. This usually takes a few seconds.
            </p>
          </div>
        ) : (
          /* ─── Plan confirmed ─── */
          <div className="bg-surface-container-lowest rounded-2xl ghost-border ambient-shadow p-10">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Icon name="check_circle" className="text-green-600 text-3xl" />
            </div>
            <h1 className="font-headline italic text-3xl text-on-surface mb-3">
              Welcome aboard!
            </h1>
            <p className="text-on-surface-variant font-light text-base mb-6">
              Your <strong className="text-on-surface">{planLabel}</strong> plan
              is now active. You have full access to all features.
            </p>

            {/* Plan badge */}
            <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-5 py-2.5 mb-8">
              <Icon name="workspace_premium" className="text-primary text-lg" />
              <span className="text-sm font-label font-semibold text-primary">
                {planLabel}
              </span>
            </div>

            {/* Auto-redirect notice */}
            <p className="text-on-surface-variant/60 text-sm font-label">
              Redirecting to your {isPlanner ? "planner" : ""} dashboard in{" "}
              {countdown}s...
            </p>

            {/* Manual link */}
            <a
              href={destination}
              className="mt-4 inline-flex items-center gap-2 text-primary text-sm font-label font-medium hover:underline underline-offset-2"
            >
              Go now
              <Icon name="arrow_forward" className="text-sm" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

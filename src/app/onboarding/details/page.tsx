"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Icon from "@/components/Icon";
import Image from "next/image";

type CulturalStyle = "british" | "asian" | "arab";

function OnboardingDetailsForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, update } = useSession();

  const role = searchParams.get("role") ?? "couple";

  // Planners skip wedding details — redirect to plan page
  useEffect(() => {
    if (role === "planner") {
      router.replace("/onboarding/plan");
    }
  }, [role, router]);

  const [partner1Name, setPartner1Name] = useState("");
  const [partner2Name, setPartner2Name] = useState("");
  const [weddingDate, setWeddingDate] = useState("");
  const [culturalStyle, setCulturalStyle] = useState<CulturalStyle | null>(null);
  const [budget, setBudget] = useState("");
  const [venue, setVenue] = useState("");
  const [guestEstimate, setGuestEstimate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Minimum date = tomorrow
  const today = new Date();
  today.setDate(today.getDate() + 1);
  const minDate = today.toISOString().split("T")[0];

  // Pre-fill partner 1 name from session
  useEffect(() => {
    if (session?.user?.name) {
      setPartner1Name(session.user.name);
    }
  }, [session?.user?.name]);

  const isValid =
    partner1Name.trim() &&
    partner2Name.trim() &&
    weddingDate &&
    culturalStyle &&
    budget.trim();

  const handleSubmit = async () => {
    if (!isValid) return;

    // Validate wedding date is in the future
    if (weddingDate && new Date(weddingDate) <= new Date()) {
      setError("Wedding date must be in the future");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/wedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerName1: partner1Name.trim(),
          partnerName2: partner2Name.trim(),
          weddingDate,
          culturalStyle: culturalStyle === "british" ? "CLASSIC_BRITISH" : culturalStyle === "asian" ? "CLASSIC_ASIAN" : "ARAB",
          totalBudget: parseFloat(budget) || 0,
          venue: venue.trim() || null,
          notes: guestEstimate ? `Estimated guests: ${guestEstimate}` : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        // If wedding already exists, just go to dashboard
        if (res.status === 409) {
          await update();
          window.location.href = "/onboarding/plan";
          return;
        }
        throw new Error(data?.error ?? "Something went wrong. Please try again.");
      }

      // Refresh the session so hasWedding/weddingId are updated in JWT
      await update();
      // Use window.location to force full page reload (clears cached JWT)
      window.location.href = "/onboarding/plan";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const culturalOptions: { value: CulturalStyle; label: string; icon: string }[] = [
    { value: "british", label: "Classic British", icon: "church" },
    { value: "asian", label: "Classic Asian", icon: "temple_buddhist" },
    { value: "arab", label: "Arab", icon: "mosque" },
  ];

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
        <div className="w-full max-w-2xl text-center">
          {/* Logo */}
          <Image src="/images/knotbook-logo-full.png"
            alt="KnotBook"
            className="h-28 w-auto mx-auto mb-6" width={600} height={600} />

          {/* Divider */}
          <div className="w-12 h-[1px] bg-outline-variant mx-auto mb-10" />

          {/* Headline */}
          <h2 className="font-headline italic text-4xl md:text-6xl text-on-surface mb-4">
            Your wedding details
          </h2>

          {/* Subtext */}
          <p className="text-on-surface-variant font-light text-base md:text-lg mb-12">
            Tell us a little more so we can personalise your planning experience.
          </p>

          {/* Form Card */}
          <div className="bg-surface-container-lowest ghost-border rounded-xl p-8 md:p-10 text-left space-y-8">
            {/* Partner Names */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Partner 1 */}
              <div>
                <label
                  htmlFor="partner1"
                  className="block font-label text-sm text-on-surface-variant mb-2 tracking-wide"
                >
                  Partner 1
                </label>
                <div className="relative">
                  <Icon name="person" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-xl" />
                  <input
                    id="partner1"
                    type="text"
                    value={partner1Name}
                    onChange={(e) => setPartner1Name(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-lg bg-background ghost-border py-3 pl-10 pr-4 text-on-surface placeholder:text-on-surface-variant/40 font-light text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Partner 2 */}
              <div>
                <label
                  htmlFor="partner2"
                  className="block font-label text-sm text-on-surface-variant mb-2 tracking-wide"
                >
                  Partner 2
                </label>
                <div className="relative">
                  <Icon name="favorite" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-xl" />
                  <input
                    id="partner2"
                    type="text"
                    value={partner2Name}
                    onChange={(e) => setPartner2Name(e.target.value)}
                    placeholder="Partner's name"
                    className="w-full rounded-lg bg-background ghost-border py-3 pl-10 pr-4 text-on-surface placeholder:text-on-surface-variant/40 font-light text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Wedding Date */}
            <div>
              <label
                htmlFor="weddingDate"
                className="block font-label text-sm text-on-surface-variant mb-2 tracking-wide"
              >
                Wedding Date
              </label>
              <div className="relative">
                <Icon name="calendar_month" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-xl" />
                <input
                  id="weddingDate"
                  type="date"
                  value={weddingDate}
                  min={minDate}
                  onChange={(e) => setWeddingDate(e.target.value)}
                  className="w-full rounded-lg bg-background ghost-border py-3 pl-10 pr-4 text-on-surface font-light text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Cultural Style */}
            <div>
              <label className="block font-label text-sm text-on-surface-variant mb-3 tracking-wide">
                Cultural Style
              </label>
              <div className="flex flex-wrap gap-3">
                {culturalOptions.map((option) => (
                  <label key={option.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="culturalStyle"
                      value={option.value}
                      className="peer sr-only"
                      checked={culturalStyle === option.value}
                      onChange={() => setCulturalStyle(option.value)}
                    />
                    <div
                      className={`
                        flex items-center gap-2 rounded-full px-5 py-2.5 transition-all duration-300
                        ghost-border bg-background
                        hover:border-primary-container hover:shadow-sm
                        peer-checked:bg-primary/10 peer-checked:border-primary
                        peer-checked:ring-1 peer-checked:ring-primary/20
                      `}
                    >
                      <Icon name={option.icon} className="text-lg text-primary" />
                      <span className="text-sm font-light text-on-surface">
                        {option.label}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Budget */}
            <div>
              <label
                htmlFor="budget"
                className="block font-label text-sm text-on-surface-variant mb-2 tracking-wide"
              >
                Estimated Total Budget
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-sm font-medium">
                  &pound;
                </span>
                <input
                  id="budget"
                  type="text"
                  inputMode="numeric"
                  value={budget ? Number(budget).toLocaleString("en-GB") : ""}
                  onChange={(e) => setBudget(e.target.value.replace(/,/g, "").replace(/[^0-9]/g, ""))}
                  placeholder="e.g. 25,000"
                  className="w-full rounded-lg bg-background ghost-border py-3 pl-8 pr-4 text-on-surface placeholder:text-on-surface-variant/40 font-light text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary transition-all"
                />
              </div>
            </div>

            {/* Venue & Guest Estimate */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Venue */}
              <div>
                <label
                  htmlFor="venue"
                  className="block font-label text-sm text-on-surface-variant mb-2 tracking-wide"
                >
                  Venue <span className="text-on-surface-variant/40">(optional)</span>
                </label>
                <div className="relative">
                  <Icon name="location_on" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-xl" />
                  <input
                    id="venue"
                    type="text"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    placeholder="e.g. The Grand Hall, London"
                    className="w-full rounded-lg bg-background ghost-border py-3 pl-10 pr-4 text-on-surface placeholder:text-on-surface-variant/40 font-light text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>

              {/* Estimated Guests */}
              <div>
                <label
                  htmlFor="guestEstimate"
                  className="block font-label text-sm text-on-surface-variant mb-2 tracking-wide"
                >
                  Estimated Guests <span className="text-on-surface-variant/40">(optional)</span>
                </label>
                <div className="relative">
                  <Icon name="groups" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60 text-xl" />
                  <input
                    id="guestEstimate"
                    type="text"
                    inputMode="numeric"
                    value={guestEstimate}
                    onChange={(e) => setGuestEstimate(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="e.g. 250"
                    className="w-full rounded-lg bg-background ghost-border py-3 pl-10 pr-4 text-on-surface placeholder:text-on-surface-variant/40 font-light text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-error-container/20 border border-error/30 px-4 py-3">
                <Icon name="error" className="text-error text-xl" />
                <p className="text-error text-sm font-light">{error}</p>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className={`
              mt-10 w-full max-w-md mx-auto flex items-center justify-center gap-2
              rounded-full py-4 px-8 text-on-primary font-label font-medium
              tracking-wide text-base transition-all duration-300
              ${
                isValid && !isSubmitting
                  ? "gold-gradient hover:opacity-90 hover:shadow-lg active:scale-[0.98] cursor-pointer"
                  : "bg-surface-container-high text-on-surface-variant/40 cursor-not-allowed"
              }
            `}
          >
            {isSubmitting ? (
              <>
                <Icon name="progress_activity" className="text-xl animate-spin" />
                Creating&hellip;
              </>
            ) : (
              <>
                Create My Wedding
                <Icon name="celebration" className="text-xl" />
              </>
            )}
          </button>

          {/* Step Indicator */}
          <p className="mt-8 text-on-surface-variant/60 italic font-headline text-sm">
            Step 2 of 3
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

export default function OnboardingDetailsPage() {
  return (
    <Suspense>
      <OnboardingDetailsForm />
    </Suspense>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Icon from "@/components/Icon";

type Role = "couple" | "planner";

export default function OnboardingPage() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const router = useRouter();
  const { update } = useSession();

  const handleContinue = async () => {
    if (!selectedRole) return;

    await fetch("/api/user/type", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userType: selectedRole === "planner" ? "PLANNER" : "COUPLE",
      }),
    });

    // Refresh JWT so the plan page can read userType
    await update();

    if (selectedRole === "planner") {
      router.push("/onboarding/plan");
    } else {
      router.push("/onboarding/details?role=couple");
    }
  };

  return (
    <div className="linen-texture min-h-screen relative overflow-hidden flex flex-col">
      {/* ── Decorative Corner Accents ── */}
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

      {/* ── Main Content ── */}
      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl text-center">
          {/* Logo */}
          <Image src="/images/knotbook-logo-full.png" alt="KnotBook" className="h-28 w-auto mx-auto mb-6" width={600} height={600} />

          {/* Divider */}
          <div className="w-12 h-[1px] bg-outline-variant mx-auto mb-10" />

          {/* Headline */}
          <h2 className="font-headline italic text-4xl md:text-6xl text-on-surface mb-4">
            Tell us about you
          </h2>

          {/* Subtext */}
          <p className="text-on-surface-variant font-light text-base md:text-lg mb-12">
            Let&apos;s tailor your experience to match your journey.
          </p>

          {/* Role Selection Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            {/* Card: Bride or Groom */}
            <label className="relative cursor-pointer group">
              <input
                type="radio"
                name="role"
                value="couple"
                className="peer sr-only"
                checked={selectedRole === "couple"}
                onChange={() => setSelectedRole("couple")}
              />
              <div
                className={`
                  relative rounded-xl p-8 transition-all duration-300
                  bg-surface-container-lowest ghost-border
                  hover:scale-[1.02] hover:shadow-lg hover:border-primary-container
                  peer-checked:bg-surface-container-low peer-checked:border-primary
                  peer-checked:ring-1 peer-checked:ring-primary/20
                  peer-checked:shadow-lg
                `}
              >
                {/* Check Circle (visible when selected) */}
                <Icon name="check_circle" className={`absolute top-4 right-4 text-primary transition-all duration-300 ${selectedRole === "couple" ? "opacity-100 scale-100" : "opacity-0 scale-75"}`} />

                {/* Icon */}
                <Icon name="auto_awesome" className="text-5xl text-primary mb-4 block" />

                {/* Title */}
                <h3 className="font-headline text-xl md:text-2xl text-on-surface mb-2">
                  I&apos;m a Bride or Groom
                </h3>

                {/* Description */}
                <p className="text-on-surface-variant text-sm font-light leading-relaxed">
                  I&apos;m planning my own wedding and want a beautiful,
                  organised space to manage every detail of my special day.
                </p>
              </div>
            </label>

            {/* Card: Wedding Planner */}
            <label className="relative cursor-pointer group">
              <input
                type="radio"
                name="role"
                value="planner"
                className="peer sr-only"
                checked={selectedRole === "planner"}
                onChange={() => setSelectedRole("planner")}
              />
              <div
                className={`
                  relative rounded-xl p-8 transition-all duration-300
                  bg-surface-container-lowest ghost-border
                  hover:scale-[1.02] hover:shadow-lg hover:border-primary-container
                  peer-checked:bg-surface-container-low peer-checked:border-primary
                  peer-checked:ring-1 peer-checked:ring-primary/20
                  peer-checked:shadow-lg
                `}
              >
                {/* Check Circle (visible when selected) */}
                <Icon name="check_circle" className={`absolute top-4 right-4 text-primary transition-all duration-300 ${selectedRole === "planner" ? "opacity-100 scale-100" : "opacity-0 scale-75"}`} />

                {/* Icon */}
                <Icon name="assignment" className="text-5xl text-primary mb-4 block" />

                {/* Title */}
                <h3 className="font-headline text-xl md:text-2xl text-on-surface mb-2">
                  I&apos;m a Wedding Planner
                </h3>

                {/* Description */}
                <p className="text-on-surface-variant text-sm font-light leading-relaxed">
                  I manage multiple weddings professionally and need a
                  powerful toolkit to coordinate vendors, guests, and timelines.
                </p>
              </div>
            </label>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!selectedRole}
            className={`
              w-full max-w-md mx-auto flex items-center justify-center gap-2
              rounded-full py-4 px-8 text-on-primary font-label font-medium
              tracking-wide text-base transition-all duration-300
              ${
                selectedRole
                  ? "gold-gradient hover:opacity-90 hover:shadow-lg active:scale-[0.98] cursor-pointer"
                  : "bg-surface-container-high text-on-surface-variant/40 cursor-not-allowed"
              }
            `}
          >
            Continue
            <Icon name="arrow_forward" className="text-xl" />
          </button>

          {/* Step Indicator */}
          <p className="mt-8 text-on-surface-variant/60 italic font-headline text-sm">
            Step 1 of 3
          </p>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="text-center py-6">
        <p className="text-on-surface-variant/40 text-xs font-light tracking-wide">
          KnotBook &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get Started",
  description:
    "Set up your KnotBook wedding profile. Tell us about your role and preferences to personalise your planning experience.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

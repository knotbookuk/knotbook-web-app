import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Set Up Your Wedding",
  description:
    "Enter your wedding details to create your personalised KnotBook planning experience.",
};

export default function OnboardingDetailsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

export type StripeMode = "test" | "live";

/** Read the admin-configured Stripe mode from the database. Defaults to "test". */
export async function getStripeMode(): Promise<StripeMode> {
  const setting = await prisma.adminSetting.findUnique({
    where: { key: "stripe_mode" },
  });
  return (setting?.value as StripeMode) || "live";
}

/** Return the full Stripe configuration for the active mode. */
export async function getStripeConfig() {
  const mode = await getStripeMode();
  const prefix = mode === "live" ? "STRIPE_LIVE" : "STRIPE_TEST";

  return {
    mode,
    secretKey: process.env[`${prefix}_SECRET_KEY`]!,
    publishableKey: process.env[`${prefix}_PUBLISHABLE_KEY`]!,
    webhookSecret: process.env[`${prefix}_WEBHOOK_SECRET`]!,
    prices: {
      COUPLE_MONTHLY: process.env[`${prefix}_COUPLE_MONTHLY_PRICE_ID`]!,
      COUPLE_YEARLY: process.env[`${prefix}_COUPLE_YEARLY_PRICE_ID`]!,
      PLANNER_BASIC_MONTHLY: process.env[`${prefix}_PLANNER_BASIC_MONTHLY_PRICE_ID`]!,
      PLANNER_BASIC_YEARLY: process.env[`${prefix}_PLANNER_BASIC_YEARLY_PRICE_ID`]!,
      PLANNER_ADVANCED_MONTHLY: process.env[`${prefix}_PLANNER_ADVANCED_MONTHLY_PRICE_ID`]!,
      PLANNER_ADVANCED_YEARLY: process.env[`${prefix}_PLANNER_ADVANCED_YEARLY_PRICE_ID`]!,
    },
  };
}

/** Create a Stripe SDK instance using the active mode's secret key. */
export async function getStripeInstance(): Promise<Stripe> {
  const config = await getStripeConfig();
  return new Stripe(config.secretKey);
}

/** Map a Stripe price ID back to a PlanType enum value. */
export function priceIdToPlanType(priceId: string): string | null {
  // Check both test and live env vars
  const mapping: Record<string, string> = {};

  for (const prefix of ["STRIPE_TEST", "STRIPE_LIVE"]) {
    mapping[process.env[`${prefix}_COUPLE_MONTHLY_PRICE_ID`] ?? ""] = "COUPLE_MONTHLY";
    mapping[process.env[`${prefix}_COUPLE_YEARLY_PRICE_ID`] ?? ""] = "COUPLE_YEARLY";
    mapping[process.env[`${prefix}_PLANNER_BASIC_MONTHLY_PRICE_ID`] ?? ""] = "PLANNER_BASIC_MONTHLY";
    mapping[process.env[`${prefix}_PLANNER_BASIC_YEARLY_PRICE_ID`] ?? ""] = "PLANNER_BASIC_YEARLY";
    mapping[process.env[`${prefix}_PLANNER_ADVANCED_MONTHLY_PRICE_ID`] ?? ""] = "PLANNER_ADVANCED_MONTHLY";
    mapping[process.env[`${prefix}_PLANNER_ADVANCED_YEARLY_PRICE_ID`] ?? ""] = "PLANNER_ADVANCED_YEARLY";
  }

  return mapping[priceId] || null;
}

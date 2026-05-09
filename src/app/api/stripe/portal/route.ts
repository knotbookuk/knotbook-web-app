import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripeInstance, getStripeMode } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/stripe/portal");

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to POST /api/stripe/portal");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    log.debug("Creating billing portal session", { userId });

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      select: { stripeCustomerId: true },
    });

    if (!subscription?.stripeCustomerId) {
      log.warn("No active subscription found", { userId });
      return NextResponse.json(
        { error: "No active subscription" },
        { status: 400 }
      );
    }

    const stripe = await getStripeInstance();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || "https://knotbook.co.uk"}/dashboard/subscription`,
    });

    log.info("Billing portal session created", { userId });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    const message = (err as Error).message ?? "";
    log.error("Failed to create billing portal session", { error: message });

    // Stripe returns "No such customer: 'cus_xxx'" when the stripeCustomerId
    // belongs to the *other* mode (e.g. user signed up in test mode but
    // Stripe is now in live mode, or vice versa). Surface a clear message
    // instead of a 500 so testers don't think the button is broken.
    if (/no such customer/i.test(message)) {
      const currentMode = await getStripeMode();
      return NextResponse.json(
        {
          error: `Your subscription was created in Stripe ${currentMode === "live" ? "test" : "live"} mode but the platform is currently in ${currentMode} mode. Switch the Stripe mode in admin settings to manage this account's billing.`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Couldn't open the billing portal. Try again or contact support." },
      { status: 500 }
    );
  }
}

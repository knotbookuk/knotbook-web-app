import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripeInstance, getStripeConfig } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/stripe/checkout");

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to POST /api/stripe/checkout");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { priceId, successUrl: customSuccessUrl, cancelUrl: customCancelUrl } = await req.json();

    if (!priceId) {
      return NextResponse.json(
        { error: "Price ID is required" },
        { status: 400 }
      );
    }

    // Validate that priceId is one of our configured prices
    const config = await getStripeConfig();
    const validPriceIds = Object.values(config.prices);

    if (!validPriceIds.includes(priceId)) {
      log.warn("Invalid price ID provided", { priceId, userId: session.user.id });
      return NextResponse.json(
        { error: "Invalid price ID" },
        { status: 400 }
      );
    }

    const stripe = await getStripeInstance();

    // Get or create Stripe customer
    let stripeCustomerId: string;

    const existingSubscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    });

    if (existingSubscription?.stripeCustomerId) {
      stripeCustomerId = existingSubscription.stripeCustomerId;
      log.info("Using existing Stripe customer", { stripeCustomerId, userId: session.user.id });
    } else {
      const customer = await stripe.customers.create({
        email: session.user.email ?? undefined,
        name: session.user.name ?? undefined,
        metadata: { userId: session.user.id },
      });
      stripeCustomerId = customer.id;
      log.info("Created new Stripe customer", { stripeCustomerId, userId: session.user.id });
    }

    // Use configured URL, or derive from request headers (never fall back to localhost in production)
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `${req.headers.get("x-forwarded-proto") || "https"}://${req.headers.get("host") || "knotbook.co.uk"}`;

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: customSuccessUrl ? `${appUrl}${customSuccessUrl}` : `${appUrl}/subscription-success`,
      cancel_url: customCancelUrl ? `${appUrl}${customCancelUrl}` : `${appUrl}/dashboard/subscription?cancelled=true`,
      metadata: { userId: session.user.id },
      subscription_data: {
        metadata: { userId: session.user.id },
      },
      allow_promotion_codes: true,
    });

    log.info("Checkout session created", {
      sessionId: checkoutSession.id,
      userId: session.user.id,
      priceId,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    log.error("Failed to create checkout session", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeConfig, priceIdToPlanType } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { sendEmail } from "@/lib/email/send";

const log = createLogger("api/stripe/webhook");

export async function POST(req: Request) {
  try {
    const config = await getStripeConfig();
    const stripe = new Stripe(config.secretKey);

    const body = await req.text();
    const sig = req.headers.get("stripe-signature");

    if (!sig) {
      log.error("Missing stripe-signature header");
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 },
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, config.webhookSecret);
    } catch (err) {
      log.error("Webhook signature verification failed", err);
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 },
      );
    }

    log.info(`Received event: ${event.type}`, { id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (!userId) {
          log.error("No userId in session metadata", {
            sessionId: session.id,
          });
          return NextResponse.json({ received: true });
        }

        if (!session.subscription) {
          log.error("No subscription in session", { sessionId: session.id });
          return NextResponse.json({ received: true });
        }

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string,
        );
        const priceId = subscription.items.data[0].price.id;
        const planType = priceIdToPlanType(priceId);

        if (!planType) {
          log.error("Unknown price ID, cannot map to plan type", { priceId });
          return NextResponse.json({ received: true });
        }

        const item = subscription.items.data[0];
        const periodStart = item.current_period_start
          ? new Date(item.current_period_start * 1000)
          : new Date();
        const periodEnd = item.current_period_end
          ? new Date(item.current_period_end * 1000)
          : null;

        await prisma.subscription.upsert({
          where: { userId },
          create: {
            userId,
            plan: planType as any,
            status: "ACTIVE",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            cancelAtPeriodEnd: false,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          },
          update: {
            plan: planType as any,
            status: "ACTIVE",
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            stripePriceId: priceId,
            cancelAtPeriodEnd: false,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          },
        });

        log.info("Subscription created/updated via checkout", {
          userId,
          plan: planType,
        });

        // Send payment receipt email
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, name: true },
        });
        if (user) {
          const amount = subscription.items.data[0].price.unit_amount;
          const interval = subscription.items.data[0].price.recurring?.interval;
          const planLabel = planType.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
            .replace("Monthly", "(Monthly)")
            .replace("Yearly", "(Yearly)");

          sendEmail({
            slug: "payment-receipt",
            to: user.email,
            recipientName: user.name,
            variables: {
              name: user.name,
              plan: planLabel,
              amount: `£${((amount || 0) / 100).toFixed(2)}/${interval === "year" ? "year" : "month"}`,
              date: new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
              nextBillingDate: periodEnd
                ? periodEnd.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                : "N/A",
            },
          }).catch((err) => log.error("Failed to send payment receipt email", { error: (err as Error).message }));
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        let userId: string | undefined = subscription.metadata?.userId;

        if (!userId) {
          const existing = await prisma.subscription.findUnique({
            where: { stripeSubscriptionId: subscription.id },
          });
          userId = existing?.userId;
        }

        if (!userId) {
          log.error("Cannot find userId for subscription update", {
            subscriptionId: subscription.id,
          });
          return NextResponse.json({ received: true });
        }

        const statusMap: Record<string, string> = {
          active: "ACTIVE",
          past_due: "PAST_DUE",
          canceled: "CANCELLED",
          trialing: "TRIALING",
        };

        const subItem = subscription.items.data[0];
        const subPriceId = subItem.price.id;
        const subPlanType = priceIdToPlanType(subPriceId);

        const updateData: Record<string, unknown> = {
          status: statusMap[subscription.status] || "ACTIVE",
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          currentPeriodStart: subItem.current_period_start
            ? new Date(subItem.current_period_start * 1000)
            : undefined,
          currentPeriodEnd: subItem.current_period_end
            ? new Date(subItem.current_period_end * 1000)
            : undefined,
          stripePriceId: subPriceId,
        };

        if (subPlanType) {
          updateData.plan = subPlanType as any;
        }

        await prisma.subscription.update({
          where: { userId },
          data: updateData,
        });

        log.info("Subscription updated", {
          userId,
          status: statusMap[subscription.status],
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        let userId: string | undefined = subscription.metadata?.userId;

        if (!userId) {
          const existing = await prisma.subscription.findUnique({
            where: { stripeSubscriptionId: subscription.id },
          });
          userId = existing?.userId;
        }

        if (!userId) {
          log.error("Cannot find userId for subscription deletion", {
            subscriptionId: subscription.id,
          });
          return NextResponse.json({ received: true });
        }

        await prisma.subscription.update({
          where: { userId },
          data: { status: "CANCELLED" },
        });

        log.info("Subscription cancelled", { userId });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        if (!customerId) {
          log.error("No customer ID on failed invoice", {
            invoiceId: invoice.id,
          });
          return NextResponse.json({ received: true });
        }

        const existing = await prisma.subscription.findUnique({
          where: { stripeCustomerId: customerId },
        });

        if (!existing) {
          log.error("No subscription found for customer", { customerId });
          return NextResponse.json({ received: true });
        }

        await prisma.subscription.update({
          where: { stripeCustomerId: customerId },
          data: { status: "PAST_DUE" },
        });

        log.info("Subscription marked as past due", {
          userId: existing.userId,
          customerId,
        });
        break;
      }

      default:
        log.info(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    log.error("Webhook handler error", err);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}

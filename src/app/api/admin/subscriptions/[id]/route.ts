import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripeInstance } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/admin/subscriptions/[id]");

type Action = "cancel_at_period_end" | "cancel_immediately" | "resume" | "refund";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const action: Action = body.action;

    if (!["cancel_at_period_end", "cancel_immediately", "resume", "refund"].includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Fetch subscription from DB
    const subscription = await prisma.subscription.findUnique({ where: { id } });
    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (!subscription.stripeSubscriptionId) {
      return NextResponse.json(
        { error: "No Stripe subscription linked — cannot perform this action" },
        { status: 400 },
      );
    }

    const stripe = await getStripeInstance();

    switch (action) {
      /* ─── Cancel at period end ─── */
      case "cancel_at_period_end": {
        if (subscription.status === "CANCELLED") {
          return NextResponse.json({ error: "Subscription is already cancelled" }, { status: 400 });
        }

        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });

        await prisma.subscription.update({
          where: { id },
          data: { cancelAtPeriodEnd: true },
        });

        log.info("Subscription set to cancel at period end (admin)", {
          subscriptionId: id,
          stripeSubId: subscription.stripeSubscriptionId,
          adminId: session.user.id,
        });

        return NextResponse.json({ success: true, message: "Subscription will cancel at period end" });
      }

      /* ─── Cancel immediately ─── */
      case "cancel_immediately": {
        if (subscription.status === "CANCELLED") {
          return NextResponse.json({ error: "Subscription is already cancelled" }, { status: 400 });
        }

        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);

        await prisma.subscription.update({
          where: { id },
          data: { status: "CANCELLED", cancelAtPeriodEnd: false },
        });

        log.info("Subscription cancelled immediately (admin)", {
          subscriptionId: id,
          stripeSubId: subscription.stripeSubscriptionId,
          adminId: session.user.id,
        });

        return NextResponse.json({ success: true, message: "Subscription cancelled immediately" });
      }

      /* ─── Resume (undo pending cancellation) ─── */
      case "resume": {
        if (subscription.status === "CANCELLED") {
          return NextResponse.json(
            { error: "Cannot resume a fully cancelled subscription" },
            { status: 400 },
          );
        }

        if (!subscription.cancelAtPeriodEnd) {
          return NextResponse.json(
            { error: "Subscription is not pending cancellation" },
            { status: 400 },
          );
        }

        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: false,
        });

        await prisma.subscription.update({
          where: { id },
          data: { cancelAtPeriodEnd: false },
        });

        log.info("Subscription resumed (admin)", {
          subscriptionId: id,
          stripeSubId: subscription.stripeSubscriptionId,
          adminId: session.user.id,
        });

        return NextResponse.json({ success: true, message: "Subscription resumed" });
      }

      /* ─── Refund last payment ─── */
      case "refund": {
        if (!subscription.stripeCustomerId) {
          return NextResponse.json(
            { error: "No Stripe customer linked" },
            { status: 400 },
          );
        }

        // Find the latest successful charge for this customer
        const charges = await stripe.charges.list({
          customer: subscription.stripeCustomerId,
          limit: 1,
        });

        const latestCharge = charges.data.find((c) => c.status === "succeeded" && !c.refunded);

        if (!latestCharge) {
          return NextResponse.json(
            { error: "No refundable charges found for this customer" },
            { status: 400 },
          );
        }

        const refund = await stripe.refunds.create({
          charge: latestCharge.id,
        });

        log.info("Refund issued (admin)", {
          subscriptionId: id,
          refundId: refund.id,
          amount: refund.amount,
          chargeId: latestCharge.id,
          adminId: session.user.id,
        });

        return NextResponse.json({
          success: true,
          message: `Refund of £${(refund.amount / 100).toFixed(2)} issued`,
          refundId: refund.id,
        });
      }
    }
  } catch (err) {
    const message = (err as Error).message;
    log.error("Admin subscription action failed", { error: message });
    return NextResponse.json(
      { error: message || "Action failed" },
      { status: 500 },
    );
  }
}

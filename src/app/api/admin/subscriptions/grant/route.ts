import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/admin/subscriptions/grant");

const VALID_PLANS = [
  "COUPLE_MONTHLY",
  "COUPLE_YEARLY",
  "PLANNER_BASIC_MONTHLY",
  "PLANNER_BASIC_YEARLY",
  "PLANNER_ADVANCED_MONTHLY",
  "PLANNER_ADVANCED_YEARLY",
] as const;

type PlanKey = (typeof VALID_PLANS)[number];

/**
 * POST: grant a complimentary subscription to a user.
 *
 * Comp subscriptions have stripeSubscriptionId/stripeCustomerId left null,
 * so the Stripe webhook handlers (which look up records by those IDs) won't
 * touch them. The existing admin cancel/refund actions are also gated by
 * `if (!subscription.stripeSubscriptionId) return error(...)`, so they
 * cannot accidentally call Stripe APIs against a comp record.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { userId, plan, durationDays } = body as {
      userId?: string;
      plan?: string;
      durationDays?: number | null;
    };

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!plan || !VALID_PLANS.includes(plan as PlanKey)) {
      return NextResponse.json(
        { error: `plan must be one of: ${VALID_PLANS.join(", ")}` },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscription: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Block overwriting an active Stripe subscription. The admin must cancel
    // it via the Stripe action first to avoid orphaning a paid subscription.
    if (user.subscription?.stripeSubscriptionId) {
      return NextResponse.json(
        {
          error:
            "User already has an active Stripe subscription. Cancel it via the Actions menu before granting a comp.",
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const periodEnd =
      durationDays && durationDays > 0
        ? new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)
        : null; // null = no expiry

    const subscription = await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        plan: plan as PlanKey,
        status: "ACTIVE",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        cancelAtPeriodEnd: false,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      update: {
        plan: plan as PlanKey,
        status: "ACTIVE",
        cancelAtPeriodEnd: false,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true, createdAt: true } },
      },
    });

    log.info("Comp subscription granted", {
      adminId: session.user.id,
      targetUserId: userId,
      plan,
      durationDays: durationDays ?? "unlimited",
    });

    return NextResponse.json(subscription, { status: 201 });
  } catch (err) {
    log.error("Failed to grant comp subscription", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to grant subscription" },
      { status: 500 },
    );
  }
}

/**
 * DELETE: revoke a complimentary subscription.
 *
 * Refuses to delete records that have a Stripe subscription linked — those
 * must go through the Stripe-aware cancel action instead.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id query param required" }, { status: 400 });
    }

    const subscription = await prisma.subscription.findUnique({ where: { id } });
    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (subscription.stripeSubscriptionId) {
      return NextResponse.json(
        {
          error:
            "This subscription is linked to Stripe — use the Actions menu to cancel it instead.",
        },
        { status: 400 },
      );
    }

    await prisma.subscription.delete({ where: { id } });

    log.info("Comp subscription revoked", {
      adminId: session.user.id,
      subscriptionId: id,
      targetUserId: subscription.userId,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("Failed to revoke comp subscription", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to revoke subscription" },
      { status: 500 },
    );
  }
}

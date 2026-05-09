import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/admin");

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/admin");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      log.warn("Non-admin access attempt to GET /api/admin", {
        userId: session.user.id,
        role: session.user.role,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    log.debug("GET /api/admin", { userId: session.user.id });

    const [
      totalUsers,
      usersWithSubscriptions,
      subscriptionBreakdown,
      recentSignups,
      allUsers,
      billingTotal,
    ] = await Promise.all([
      // Total user count
      prisma.user.count(),

      // Users who have an active subscription
      prisma.subscription.count({
        where: { status: "ACTIVE" },
      }),

      // Subscription breakdown by plan type
      prisma.subscription.groupBy({
        by: ["plan"],
        where: { status: "ACTIVE" },
        _count: { plan: true },
      }),

      // Recent signups (last 10 users with subscription info)
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          subscription: {
            select: {
              plan: true,
              status: true,
            },
          },
          weddings: {
            select: {
              id: true,
              partnerName1: true,
              partnerName2: true,
              weddingDate: true,
            },
          },
        },
      }),

      // All users for the users tab
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          subscription: {
            select: {
              plan: true,
              status: true,
            },
          },
          weddings: {
            select: {
              id: true,
              partnerName1: true,
              partnerName2: true,
              weddingDate: true,
            },
          },
        },
      }),

      // Total revenue from billing records
      prisma.billingRecord.aggregate({
        _sum: { amount: true },
      }),
    ]);

    // Group active subs by tier (couple / planner_basic / planner_advanced / legacy)
    const tierCounts = {
      couple: 0,
      planner_basic: 0,
      planner_advanced: 0,
      legacy: 0,
    };
    for (const group of subscriptionBreakdown) {
      const plan = group.plan;
      const count = group._count.plan;
      if (plan === "COUPLE_MONTHLY" || plan === "COUPLE_YEARLY") {
        tierCounts.couple += count;
      } else if (plan === "PLANNER_BASIC_MONTHLY" || plan === "PLANNER_BASIC_YEARLY") {
        tierCounts.planner_basic += count;
      } else if (plan === "PLANNER_ADVANCED_MONTHLY" || plan === "PLANNER_ADVANCED_YEARLY") {
        tierCounts.planner_advanced += count;
      } else {
        tierCounts.legacy += count;
      }
    }

    const revenue = Number(billingTotal._sum.amount ?? 0);

    log.info("Fetched admin data", {
      totalUsers,
      activeSubscriptions: usersWithSubscriptions,
      revenue,
    });

    return NextResponse.json({
      totalUsers,
      activeSubscriptions: usersWithSubscriptions,
      revenue,
      subscriptions: tierCounts,
      recentSignups,
      allUsers,
    });
  } catch (err) {
    log.error("Failed to fetch admin data", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Failed to fetch admin data" },
      { status: 500 }
    );
  }
}

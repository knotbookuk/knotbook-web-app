import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/admin/subscriptions");

const VALID_STATUSES = ["ACTIVE", "PAST_DUE", "CANCELLED", "TRIALING"] as const;
const VALID_PLANS = [
  "MONTHLY",
  "LIFETIME",
  "COUPLE_MONTHLY",
  "COUPLE_YEARLY",
  "PLANNER_BASIC_MONTHLY",
  "PLANNER_BASIC_YEARLY",
  "PLANNER_ADVANCED_MONTHLY",
  "PLANNER_ADVANCED_YEARLY",
] as const;

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/admin/subscriptions");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      log.warn("Non-admin access attempt to GET /api/admin/subscriptions", {
        userId: session.user.id,
        role: session.user.role,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    log.debug("GET /api/admin/subscriptions", { userId: session.user.id });

    const { searchParams } = new URL(req.url);

    // Pagination params. When `paginate` is omitted we keep the legacy
    // "return everything" behaviour so existing callers don't break.
    const paginate = searchParams.get("paginate") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(
      500,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10) || 20),
    );

    const search = searchParams.get("search") || "";
    const statusParam = searchParams.get("status") || "";
    const planParam = searchParams.get("plan") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.user = {
        is: {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        },
      };
    }

    if (statusParam && statusParam !== "all") {
      if ((VALID_STATUSES as readonly string[]).includes(statusParam)) {
        where.status = statusParam;
      }
    }

    if (planParam && planParam !== "all") {
      if ((VALID_PLANS as readonly string[]).includes(planParam)) {
        where.plan = planParam;
      }
    }

    if (!paginate) {
      const subscriptions = await prisma.subscription.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, createdAt: true },
          },
        },
      });
      log.info("Fetched all subscriptions (admin, unpaginated)", {
        count: subscriptions.length,
      });
      return NextResponse.json(subscriptions);
    }

    // Stats are computed across the entire subscriptions table (not just the
    // filtered/current page) so the cards reflect totals.
    const [items, total, statusCounts] = await Promise.all([
      prisma.subscription.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true, createdAt: true },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.subscription.count({ where }),
      prisma.subscription.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    let totalAll = 0;
    let activeAll = 0;
    let pastDueAll = 0;
    let cancelledAll = 0;
    for (const row of statusCounts) {
      const c = row._count._all;
      totalAll += c;
      if (row.status === "ACTIVE") activeAll = c;
      else if (row.status === "PAST_DUE") pastDueAll = c;
      else if (row.status === "CANCELLED") cancelledAll = c;
    }

    const stats = {
      total: totalAll,
      active: activeAll,
      pastDue: pastDueAll,
      cancelled: cancelledAll,
    };

    log.info("Fetched subscriptions (paginated)", {
      count: items.length,
      total,
      page,
      pageSize,
    });

    return NextResponse.json({ items, total, page, pageSize, stats });
  } catch (err) {
    log.error("Failed to fetch admin subscriptions", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}

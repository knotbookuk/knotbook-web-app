import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/admin/users");

/**
 * Admin user list.
 *
 * Two modes:
 *
 * 1. Unpaginated (legacy) — when `paginate` is omitted/false. Returns the slim
 *    user list used by admin pickers (e.g. the comp-subscription grant modal at
 *    /admin/subscriptions). Existing callers expect a bare array, so we keep
 *    that shape.
 *
 * 2. Paginated — when `paginate=true`. Returns `{ items, total, page, pageSize }`
 *    and supports `search` (name/email contains, case-insensitive) plus
 *    `filter=all|with_sub|without_sub` for the admin Users page tabs. Items
 *    include `createdAt` and `weddings` so the table can render signup date
 *    and wedding badge.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const paginate = searchParams.get("paginate") === "true";

    if (!paginate) {
      // Legacy slim list — used by the comp-grant user picker.
      const users = await prisma.user.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          userType: true,
          subscription: {
            select: {
              plan: true,
              status: true,
              stripeSubscriptionId: true,
            },
          },
        },
      });
      return NextResponse.json(users);
    }

    const page = Math.max(
      1,
      parseInt(searchParams.get("page") || "1", 10) || 1,
    );
    const pageSize = Math.min(
      500,
      Math.max(
        1,
        parseInt(searchParams.get("pageSize") || "20", 10) || 20,
      ),
    );
    const search = (searchParams.get("search") || "").trim();
    const filter = searchParams.get("filter") || "all"; // all | with_sub | without_sub

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (filter === "with_sub") {
      where.subscription = { isNot: null };
    } else if (filter === "without_sub") {
      where.subscription = { is: null };
    }

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
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
      prisma.user.count({ where }),
    ]);

    log.info("Fetched admin users (paginated)", {
      count: items.length,
      total,
      page,
      pageSize,
      filter,
      hasSearch: !!search,
    });

    return NextResponse.json({ items, total, page, pageSize });
  } catch (err) {
    log.error("Failed to fetch users list", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 },
    );
  }
}

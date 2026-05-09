import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/admin/feedback");

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/admin/feedback");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      log.warn("Non-admin access attempt to GET /api/admin/feedback", {
        userId: session.user.id,
        role: session.user.role,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    log.debug("GET /api/admin/feedback", { userId: session.user.id });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const read = searchParams.get("read") || "all"; // "read" | "unread" | "all"

    // Pagination params. When `paginate` is omitted we keep the legacy
    // "return everything" behaviour so existing callers don't break.
    const paginate = searchParams.get("paginate") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(
      500,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10) || 20),
    );

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { featureArea: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (read === "read") {
      where.isRead = true;
    } else if (read === "unread") {
      where.isRead = false;
    }

    if (!paginate) {
      const items = await prisma.feedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });
      log.info("Fetched all feedback (admin, unpaginated)", { count: items.length });
      return NextResponse.json(items);
    }

    // Unread count is computed across the entire feedback table (no filters)
    // so the header badge stays accurate regardless of the current view.
    const [items, total, unreadCount] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.feedback.count({ where }),
      prisma.feedback.count({ where: { isRead: false } }),
    ]);

    log.info("Fetched feedback (admin, paginated)", {
      count: items.length,
      total,
      page,
      pageSize,
      unreadCount,
    });

    return NextResponse.json({ items, total, page, pageSize, unreadCount });
  } catch (err) {
    log.error("Failed to fetch admin feedback", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}

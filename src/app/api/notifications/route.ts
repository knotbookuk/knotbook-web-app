import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/notifications");

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/notifications");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    log.debug("GET /api/notifications", { userId });

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

    const where: Record<string, unknown> = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    log.info("Fetched notifications", { count: notifications.length, unreadCount, userId });

    return NextResponse.json({ notifications, unreadCount });
  } catch (err) {
    log.error("Failed to fetch notifications", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to PATCH /api/notifications");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    log.debug("PATCH /api/notifications", { userId });

    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "An array of notification IDs is required" },
        { status: 400 }
      );
    }

    await prisma.notification.updateMany({
      where: {
        id: { in: ids },
        userId,
      },
      data: { isRead: true },
    });

    log.info("Notifications marked as read", { count: ids.length, userId });

    return NextResponse.json({ message: "Notifications marked as read" });
  } catch (err) {
    log.error("Failed to update notifications", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/dashboard");

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/dashboard");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("GET /api/dashboard", { userId: session.user.id, weddingId });

    const now = new Date();

    const [
      wedding,
      guestCounts,
      totalGuests,
      budgetItems,
      upcomingEvents,
      taskStats,
      totalTasks,
      recentGuests,
      overdueTaskCount,
      vendorCount,
      unreadNotifications,
    ] = await Promise.all([
      prisma.wedding.findUnique({
        where: { id: weddingId },
        select: {
          id: true,
          weddingDate: true,
          partnerName1: true,
          partnerName2: true,
          culturalStyle: true,
          totalBudget: true,
        },
      }),
      prisma.guest.groupBy({
        by: ["rsvpStatus"],
        where: { weddingId },
        _count: { rsvpStatus: true },
      }),
      prisma.guest.count({ where: { weddingId } }),
      prisma.budgetItem.findMany({
        where: { weddingId },
        select: { estimatedCost: true, actualCost: true, paidAmount: true },
      }),
      prisma.event.findMany({
        where: { weddingId, date: { gte: now } },
        orderBy: { date: "asc" },
        take: 5,
        select: {
          id: true,
          name: true,
          date: true,
          startTime: true,
          venue: true,
          dayLabel: true,
        },
      }),
      prisma.task.groupBy({
        by: ["status"],
        where: { weddingId },
        _count: { status: true },
      }),
      prisma.task.count({ where: { weddingId } }),
      prisma.guest.findMany({
        where: { weddingId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          rsvpStatus: true,
          familySide: true,
          createdAt: true,
        },
      }),
      prisma.task.count({
        where: {
          weddingId,
          status: { not: "COMPLETED" },
          dueDate: { lt: now },
        },
      }),
      prisma.vendor.count({ where: { weddingId } }),
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false },
      }),
    ]);

    const guestSummary = {
      total: totalGuests,
      attending: 0,
      notComing: 0,
      noResponse: 0,
    };
    for (const g of guestCounts) {
      if (g.rsvpStatus === "ATTENDING") guestSummary.attending = g._count.rsvpStatus;
      if (g.rsvpStatus === "NOT_COMING") guestSummary.notComing = g._count.rsvpStatus;
      if (g.rsvpStatus === "NO_RESPONSE") guestSummary.noResponse = g._count.rsvpStatus;
    }

    const totalEstimated = budgetItems.reduce(
      (sum, i) => sum + Number(i.estimatedCost),
      0
    );
    const totalActual = budgetItems.reduce(
      (sum, i) => sum + Number(i.actualCost),
      0
    );
    const totalPaid = budgetItems.reduce(
      (sum, i) => sum + Number(i.paidAmount),
      0
    );

    const taskSummary = {
      total: totalTasks,
      todo: 0,
      inProgress: 0,
      completed: 0,
      overdue: overdueTaskCount,
    };
    for (const t of taskStats) {
      if (t.status === "TODO") taskSummary.todo = t._count.status;
      if (t.status === "IN_PROGRESS") taskSummary.inProgress = t._count.status;
      if (t.status === "COMPLETED") taskSummary.completed = t._count.status;
    }

    const daysUntilWedding = wedding?.weddingDate
      ? Math.ceil(
          (new Date(wedding.weddingDate).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    log.info("Fetched dashboard data", {
      weddingId,
      totalGuests,
      totalTasks,
      vendorCount,
      upcomingEventsCount: upcomingEvents.length,
    });

    return NextResponse.json({
      wedding: {
        ...wedding,
        daysUntilWedding,
      },
      guests: guestSummary,
      budget: {
        total: Number(wedding?.totalBudget ?? 0),
        estimated: totalEstimated,
        actual: totalActual,
        paid: totalPaid,
        remaining: Number(wedding?.totalBudget ?? 0) - totalActual,
      },
      tasks: taskSummary,
      upcomingEvents,
      recentGuests,
      vendorCount,
      unreadNotifications,
    });
  } catch (err) {
    log.error("Failed to fetch dashboard data", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

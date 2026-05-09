import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/planner/dashboard");

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.userType !== "PLANNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const weddings = await prisma.wedding.findMany({
      where: { userId: session.user.id },
      orderBy: { weddingDate: "asc" },
      include: {
        _count: { select: { guests: true, tasks: true } },
      },
    });

    const totalClients = weddings.length;

    // Weddings this month
    const weddingsThisMonth = weddings.filter((w) =>
      w.weddingDate && w.weddingDate >= startOfMonth && w.weddingDate <= endOfMonth
    ).length;

    // Tasks due soon (incomplete tasks across all weddings)
    const weddingIds = weddings.map((w) => w.id);
    const tasksDueSoon = await prisma.task.count({
      where: { weddingId: { in: weddingIds }, status: { not: "COMPLETED" } },
    });

    // Upcoming tasks (first 5)
    const upcomingTasks = await prisma.task.findMany({
      where: { weddingId: { in: weddingIds }, status: { not: "COMPLETED" } },
      orderBy: { dueDate: "asc" },
      take: 5,
      include: { wedding: { select: { clientName: true, partnerName1: true, partnerName2: true } } },
    });

    // Upcoming weddings (future only)
    const upcomingWeddings = weddings
      .filter((w) => w.weddingDate && w.weddingDate > now)
      .slice(0, 5)
      .map((w) => ({
        id: w.id,
        clientName: w.clientName || `${w.partnerName1} & ${w.partnerName2}`,
        weddingDate: w.weddingDate,
        guestCount: w._count.guests,
        taskCount: w._count.tasks,
      }));

    // Next wedding (nearest future)
    const nextWedding = upcomingWeddings[0] || null;

    return NextResponse.json({
      totalClients,
      weddingsThisMonth,
      tasksDueSoon,
      nextWedding,
      upcomingWeddings,
      upcomingTasks: upcomingTasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate,
        priority: t.priority,
        clientName: t.wedding.clientName || `${t.wedding.partnerName1} & ${t.wedding.partnerName2}`,
      })),
    });
  } catch (err) {
    log.error("Failed to fetch planner dashboard", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to fetch dashboard stats" }, { status: 500 });
  }
}

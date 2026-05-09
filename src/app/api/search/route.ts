import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/search");

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ results: [] });
    }

    const q = req.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    log.debug("Global search", { query: q, weddingId });

    const [guests, tasks, vendors, events, checklists] = await Promise.all([
      prisma.guest.findMany({
        where: {
          weddingId,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, name: true, rsvpStatus: true },
      }),
      prisma.task.findMany({
        where: {
          weddingId,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, title: true, status: true },
      }),
      prisma.vendor.findMany({
        where: {
          weddingId,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { category: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, name: true, category: true },
      }),
      prisma.event.findMany({
        where: {
          weddingId,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { venue: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 5,
        select: { id: true, name: true, date: true },
      }),
      prisma.checklistItem.findMany({
        where: {
          weddingId,
          title: { contains: q, mode: "insensitive" },
        },
        take: 5,
        select: { id: true, title: true, isCompleted: true },
      }),
    ]);

    const results = [
      ...guests.map((g) => ({ type: "guest" as const, id: g.id, title: g.name, subtitle: g.rsvpStatus, href: "/dashboard/guests" })),
      ...tasks.map((t) => ({ type: "task" as const, id: t.id, title: t.title, subtitle: t.status, href: "/dashboard/tasks" })),
      ...vendors.map((v) => ({ type: "vendor" as const, id: v.id, title: v.name, subtitle: v.category, href: "/dashboard/vendors" })),
      ...events.map((e) => ({ type: "event" as const, id: e.id, title: e.name, subtitle: new Date(e.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" }), href: "/dashboard/timeline" })),
      ...checklists.map((c) => ({ type: "checklist" as const, id: c.id, title: c.title, subtitle: c.isCompleted ? "Completed" : "Pending", href: "/dashboard/checklists" })),
    ];

    log.info("Search results", { query: q, count: results.length });

    return NextResponse.json({ results });
  } catch (err) {
    log.error("Search failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

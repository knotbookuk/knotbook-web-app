import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/planner/clients");

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.userType !== "PLANNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const weddings = await prisma.wedding.findMany({
      where: { userId: session.user.id },
      orderBy: { weddingDate: "asc" },
      include: {
        _count: { select: { guests: true, tasks: true, events: true, vendors: true } },
      },
    });

    // Calculate spent for each wedding
    const result = await Promise.all(weddings.map(async (w) => {
      const budgetAgg = await prisma.budgetItem.aggregate({
        where: { weddingId: w.id },
        _sum: { actualCost: true, estimatedCost: true },
      });
      return {
        id: w.id,
        clientName: w.clientName || `${w.partnerName1} & ${w.partnerName2}`,
        partnerName1: w.partnerName1,
        partnerName2: w.partnerName2,
        weddingDate: w.weddingDate,
        culturalStyle: w.culturalStyle,
        totalBudget: w.totalBudget,
        spent: budgetAgg._sum.actualCost ?? 0,
        estimated: budgetAgg._sum.estimatedCost ?? 0,
        guestCount: w._count.guests,
        taskCount: w._count.tasks,
        eventCount: w._count.events,
        vendorCount: w._count.vendors,
        createdAt: w.createdAt,
      };
    }));

    return NextResponse.json(result);
  } catch (err) {
    log.error("Failed to fetch planner clients", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to fetch clients" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.userType !== "PLANNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { clientName, partnerName1, partnerName2, weddingDate, culturalStyle, totalBudget } = await req.json();

    if (!partnerName1?.trim() || !partnerName2?.trim()) {
      return NextResponse.json({ error: "Partner names are required" }, { status: 400 });
    }

    const validStyles = ["CLASSIC_BRITISH", "CLASSIC_ASIAN", "ARAB"];
    const style = culturalStyle && validStyles.includes(culturalStyle) ? culturalStyle : "CLASSIC_ASIAN";

    const wedding = await prisma.wedding.create({
      data: {
        userId: session.user.id,
        clientName: clientName?.trim() || `${partnerName1.trim()} & ${partnerName2.trim()}`,
        partnerName1: partnerName1.trim(),
        partnerName2: partnerName2.trim(),
        weddingDate: weddingDate ? new Date(weddingDate) : null,
        culturalStyle: style,
        totalBudget: totalBudget ?? 0,
      },
    });

    log.info("Client wedding created", { weddingId: wedding.id, userId: session.user.id });
    return NextResponse.json(wedding, { status: 201 });
  } catch (err) {
    log.error("Failed to create client wedding", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to create client wedding" }, { status: 500 });
  }
}

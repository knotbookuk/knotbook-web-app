import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { recheckBudgetAlerts } from "@/lib/budget-alerts";

const log = createLogger("api/budget");

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/budget");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("GET /api/budget", { userId: session.user.id, weddingId });

    const [items, wedding] = await Promise.all([
      prisma.budgetItem.findMany({
        where: { weddingId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      }),
      prisma.wedding.findUnique({
        where: { id: weddingId },
        select: { totalBudget: true },
      }),
    ]);

    const totalEstimated = items.reduce(
      (sum, item) => sum + Number(item.estimatedCost),
      0
    );
    const totalActual = items.reduce(
      (sum, item) => sum + Number(item.actualCost),
      0
    );
    const totalPaid = items.reduce(
      (sum, item) => sum + Number(item.paidAmount),
      0
    );

    log.info("Fetched budget items", { count: items.length, weddingId });

    return NextResponse.json({
      items,
      totals: {
        budget: Number(wedding?.totalBudget ?? 0),
        estimated: totalEstimated,
        actual: totalActual,
        paid: totalPaid,
        remaining: Number(wedding?.totalBudget ?? 0) - totalActual,
      },
    });
  } catch (err) {
    log.error("Failed to fetch budget items", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch budget items" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to POST /api/budget");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("POST /api/budget", { userId: session.user.id, weddingId });

    const body = await req.json();
    const { category, description, estimatedCost, actualCost, paidAmount, dueDate, status, notes, sortOrder } = body;

    if (!category || !category.trim()) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    const item = await prisma.budgetItem.create({
      data: {
        weddingId,
        category: category.trim(),
        description: description?.trim() || null,
        estimatedCost: estimatedCost ?? 0,
        actualCost: actualCost ?? 0,
        paidAmount: paidAmount ?? 0,
        dueDate: dueDate ? new Date(dueDate) : null,
        status: status || "DUE",
        notes: notes?.trim() || null,
        sortOrder: sortOrder ?? 0,
      },
    });

    log.info("Budget item created", { itemId: item.id, category: item.category, weddingId });

    await recheckBudgetAlerts(weddingId);

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    log.error("Failed to create budget item", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to create budget item" },
      { status: 500 }
    );
  }
}

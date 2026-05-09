import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { recheckBudgetAlerts } from "@/lib/budget-alerts";

const log = createLogger("api/budget/[id]");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to PATCH /api/budget/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("PATCH /api/budget/[id]", { itemId: id, weddingId });

    const existing = await prisma.budgetItem.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Budget item not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { category, description, estimatedCost, actualCost, paidAmount, dueDate, status, notes, sortOrder } = body;

    const data: Record<string, unknown> = {};
    if (category !== undefined) data.category = category.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (estimatedCost !== undefined) data.estimatedCost = estimatedCost;
    if (actualCost !== undefined) data.actualCost = actualCost;
    if (paidAmount !== undefined) data.paidAmount = paidAmount;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes?.trim() || null;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const item = await prisma.budgetItem.update({
      where: { id },
      data,
    });

    log.info("Budget item updated", { itemId: id, weddingId });

    // Re-evaluate alerts in case actualCost moved across a threshold (either direction).
    if (actualCost !== undefined) {
      await recheckBudgetAlerts(weddingId);
    }

    return NextResponse.json(item);
  } catch (err) {
    log.error("Failed to update budget item", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to update budget item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to DELETE /api/budget/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("DELETE /api/budget/[id]", { itemId: id, weddingId });

    const existing = await prisma.budgetItem.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Budget item not found" },
        { status: 404 }
      );
    }

    await prisma.budgetItem.delete({ where: { id } });

    log.info("Budget item deleted", { itemId: id, weddingId });

    // Removing an item lowers totalSpent — may untrip thresholds.
    await recheckBudgetAlerts(weddingId);

    return NextResponse.json({ message: "Budget item deleted" });
  } catch (err) {
    log.error("Failed to delete budget item", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to delete budget item" },
      { status: 500 }
    );
  }
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/checklists/[id]");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to PATCH /api/checklists/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("PATCH /api/checklists/[id]", { itemId: id, weddingId });

    const existing = await prisma.checklistItem.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Checklist item not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { title, description, category, priority, dueDate, isCompleted, sortOrder } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (category !== undefined) data.category = category?.trim() || null;
    if (priority !== undefined) data.priority = priority?.trim() || null;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (isCompleted !== undefined) {
      data.isCompleted = isCompleted;
      if (isCompleted && !existing.isCompleted) {
        data.completedAt = new Date();
      } else if (!isCompleted) {
        data.completedAt = null;
      }
    }
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const item = await prisma.checklistItem.update({
      where: { id },
      data,
    });

    log.info("Checklist item updated", { itemId: id, weddingId });

    return NextResponse.json(item);
  } catch (err) {
    log.error("Failed to update checklist item", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to update checklist item" },
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
      log.warn("Unauthorized access attempt to DELETE /api/checklists/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("DELETE /api/checklists/[id]", { itemId: id, weddingId });

    const existing = await prisma.checklistItem.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Checklist item not found" },
        { status: 404 }
      );
    }

    await prisma.checklistItem.delete({ where: { id } });

    log.info("Checklist item deleted", { itemId: id, weddingId });

    return NextResponse.json({ message: "Checklist item deleted" });
  } catch (err) {
    log.error("Failed to delete checklist item", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to delete checklist item" },
      { status: 500 }
    );
  }
}

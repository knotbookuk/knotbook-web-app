import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/tasks/[id]");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to PATCH /api/tasks/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("PATCH /api/tasks/[id]", { taskId: id, weddingId });

    const existing = await prisma.task.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await req.json();
    const { title, description, assigneeName, dueDate, priority, status, category, sortOrder } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (assigneeName !== undefined) data.assigneeName = assigneeName?.trim() || null;
    if (dueDate !== undefined) {
      const newDueDate = dueDate ? new Date(dueDate) : null;
      data.dueDate = newDueDate;
      const existingMs = existing.dueDate ? existing.dueDate.getTime() : null;
      const newMs = newDueDate ? newDueDate.getTime() : null;
      if (existingMs !== newMs) {
        data.reminderSentAt = null;
      }
    }
    if (priority !== undefined) data.priority = priority;
    if (status !== undefined) {
      data.status = status;
      if (status === "COMPLETED") {
        data.completedAt = new Date();
      } else if (existing.status === "COMPLETED" && status !== "COMPLETED") {
        data.completedAt = null;
      }
    }
    if (category !== undefined) data.category = category?.trim() || null;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const task = await prisma.task.update({
      where: { id },
      data,
    });

    log.info("Task updated", { taskId: id, status: task.status, weddingId });

    return NextResponse.json(task);
  } catch (err) {
    log.error("Failed to update task", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to update task" },
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
      log.warn("Unauthorized access attempt to DELETE /api/tasks/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("DELETE /api/tasks/[id]", { taskId: id, weddingId });

    const existing = await prisma.task.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await prisma.task.delete({ where: { id } });

    log.info("Task deleted", { taskId: id, weddingId });

    return NextResponse.json({ message: "Task deleted" });
  } catch (err) {
    log.error("Failed to delete task", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}

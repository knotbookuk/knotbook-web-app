import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/tasks");

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/tasks");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("GET /api/tasks", { userId: session.user.id, weddingId });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const category = searchParams.get("category");

    const where: Record<string, unknown> = { weddingId };

    if (status) {
      const validStatuses = ["TODO", "IN_PROGRESS", "COMPLETED"];
      if (validStatuses.includes(status)) {
        where.status = status;
      }
    }

    if (priority) {
      const validPriorities = ["HIGH", "MEDIUM", "LOW"];
      if (validPriorities.includes(priority)) {
        where.priority = priority;
      }
    }

    if (category) {
      where.category = category;
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    });

    log.info("Fetched tasks", { count: tasks.length, weddingId });

    return NextResponse.json(tasks);
  } catch (err) {
    log.error("Failed to fetch tasks", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to POST /api/tasks");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("POST /api/tasks", { userId: session.user.id, weddingId });

    const body = await req.json();
    const { title, description, assigneeName, dueDate, priority, status, category, sortOrder } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Task title is required" },
        { status: 400 }
      );
    }

    const task = await prisma.task.create({
      data: {
        weddingId,
        title: title.trim(),
        description: description?.trim() || null,
        assigneeName: assigneeName?.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || "MEDIUM",
        status: status || "TODO",
        category: category?.trim() || null,
        sortOrder: sortOrder ?? 0,
      },
    });

    log.info("Task created", { taskId: task.id, title: task.title, weddingId });

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    log.error("Failed to create task", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}

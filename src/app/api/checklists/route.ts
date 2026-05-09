import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/checklists");

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/checklists");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("GET /api/checklists", { userId: session.user.id, weddingId });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const completed = searchParams.get("completed");

    const where: Record<string, unknown> = { weddingId };

    if (category) {
      where.category = category;
    }
    if (completed === "true") {
      where.isCompleted = true;
    } else if (completed === "false") {
      where.isCompleted = false;
    }

    const items = await prisma.checklistItem.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    log.info("Fetched checklist items", { count: items.length, weddingId });

    return NextResponse.json(items);
  } catch (err) {
    log.error("Failed to fetch checklist items", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch checklist items" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to POST /api/checklists");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("POST /api/checklists", { userId: session.user.id, weddingId });

    const body = await req.json();
    const { title, description, category, priority, dueDate, isCompleted, sortOrder } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const item = await prisma.checklistItem.create({
      data: {
        weddingId,
        title: title.trim(),
        description: description?.trim() || null,
        category: category?.trim() || null,
        priority: priority?.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        isCompleted: isCompleted ?? false,
        completedAt: isCompleted ? new Date() : null,
        sortOrder: sortOrder ?? 0,
      },
    });

    log.info("Checklist item created", { itemId: item.id, title: item.title, weddingId });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    log.error("Failed to create checklist item", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to create checklist item" },
      { status: 500 }
    );
  }
}

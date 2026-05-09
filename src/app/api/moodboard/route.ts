import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/moodboard");

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/moodboard");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("GET /api/moodboard", { userId: session.user.id, weddingId });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const where: Record<string, unknown> = { weddingId };
    if (category) {
      where.category = category;
    }

    const items = await prisma.moodBoardItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    log.info("Fetched moodboard items", { count: items.length, weddingId });

    return NextResponse.json(items);
  } catch (err) {
    log.error("Failed to fetch mood board items", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch mood board items" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to POST /api/moodboard");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("POST /api/moodboard", { userId: session.user.id, weddingId });

    const body = await req.json();
    const { title, imageUrl, category, tags, notes, isSaved } = body;

    const existingCount = await prisma.moodBoardItem.count({ where: { weddingId } });
    if (existingCount >= 30) {
      return NextResponse.json(
        { error: "Mood Board is limited to 30 items. Remove some before adding more." },
        { status: 400 }
      );
    }

    const item = await prisma.moodBoardItem.create({
      data: {
        weddingId,
        title: title?.trim() || "Untitled",
        imageUrl: imageUrl?.trim() || null,
        category: category?.trim() || null,
        tags: Array.isArray(tags) ? tags : [],
        notes: notes?.trim() || null,
        isSaved: isSaved ?? true,
      },
    });

    log.info("Moodboard item created", { itemId: item.id, title: item.title, weddingId });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    log.error("Failed to create mood board item", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to create mood board item" },
      { status: 500 }
    );
  }
}

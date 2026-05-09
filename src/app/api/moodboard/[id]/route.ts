import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/moodboard/[id]");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to PATCH /api/moodboard/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("PATCH /api/moodboard/[id]", { itemId: id, weddingId });

    const existing = await prisma.moodBoardItem.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Mood board item not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { title, imageUrl, category, tags, notes, isSaved } = body;

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title.trim();
    if (imageUrl !== undefined) data.imageUrl = imageUrl?.trim() || null;
    if (category !== undefined) data.category = category?.trim() || null;
    if (tags !== undefined) data.tags = Array.isArray(tags) ? tags : [];
    if (notes !== undefined) data.notes = notes?.trim() || null;
    if (isSaved !== undefined) data.isSaved = isSaved;

    const item = await prisma.moodBoardItem.update({
      where: { id },
      data,
    });

    log.info("Moodboard item updated", { itemId: id, weddingId });

    return NextResponse.json(item);
  } catch (err) {
    log.error("Failed to update mood board item", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to update mood board item" },
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
      log.warn("Unauthorized access attempt to DELETE /api/moodboard/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("DELETE /api/moodboard/[id]", { itemId: id, weddingId });

    const existing = await prisma.moodBoardItem.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Mood board item not found" },
        { status: 404 }
      );
    }

    await prisma.moodBoardItem.delete({ where: { id } });

    log.info("Moodboard item deleted", { itemId: id, weddingId });

    return NextResponse.json({ message: "Mood board item deleted" });
  } catch (err) {
    log.error("Failed to delete mood board item", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to delete mood board item" },
      { status: 500 }
    );
  }
}

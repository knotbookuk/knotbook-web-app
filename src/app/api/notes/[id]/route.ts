import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/notes/[id]");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to PATCH /api/notes/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    // Verify note belongs to this wedding
    const existing = await prisma.note.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const body = await req.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    log.debug("PATCH /api/notes/[id]", { noteId: id, weddingId });

    const updated = await prisma.note.update({
      where: { id },
      data: { content: content.trim() },
    });

    log.info("Note updated", { id: updated.id, weddingId });

    return NextResponse.json(updated);
  } catch (err) {
    log.error("Failed to update note", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to DELETE /api/notes/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    // Verify note belongs to this wedding
    const existing = await prisma.note.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    log.debug("DELETE /api/notes/[id]", { noteId: id, weddingId });

    await prisma.note.delete({ where: { id } });

    log.info("Note deleted", { id, weddingId });

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("Failed to delete note", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}

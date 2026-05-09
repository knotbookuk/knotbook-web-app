import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/notes");

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/notes");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const section = req.nextUrl.searchParams.get("section");
    if (!section) {
      return NextResponse.json({ error: "Section parameter is required" }, { status: 400 });
    }

    log.debug("GET /api/notes", { userId: session.user.id, weddingId, section });

    const notes = await prisma.note.findMany({
      where: { weddingId, section },
      orderBy: { createdAt: "desc" },
    });

    log.info("Fetched notes", { count: notes.length, section, weddingId });

    return NextResponse.json(notes);
  } catch (err) {
    log.error("Failed to fetch notes", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to POST /api/notes");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const body = await req.json();
    const { section, content } = body;

    if (!section?.trim()) {
      return NextResponse.json({ error: "Section is required" }, { status: 400 });
    }
    if (!content?.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    log.debug("POST /api/notes", { userId: session.user.id, weddingId, section });

    const note = await prisma.note.create({
      data: {
        weddingId,
        section: section.trim(),
        content: content.trim(),
      },
    });

    log.info("Note created", { id: note.id, section, weddingId });

    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    log.error("Failed to create note", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}

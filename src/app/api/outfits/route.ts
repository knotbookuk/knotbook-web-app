import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/outfits");

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/outfits");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("GET /api/outfits", { userId: session.user.id, weddingId });

    const outfits = await prisma.outfitItem.findMany({
      where: { weddingId },
      include: {
        event: { select: { id: true, name: true, date: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    log.info("Fetched outfits", { count: outfits.length, weddingId });

    return NextResponse.json(outfits);
  } catch (err) {
    log.error("Failed to fetch outfits", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch outfits" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to POST /api/outfits");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("POST /api/outfits", { userId: session.user.id, weddingId });

    const body = await req.json();
    const { name, type, eventId, cost, status, notes, link } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Outfit name is required" },
        { status: 400 }
      );
    }

    const validStatuses = [
      "NOT_ORDERED",
      "NOT_PAID",
      "ORDERED",
      "RECEIVED",
      "ALTERED",
      "READY",
    ];
    if (status !== undefined && status !== null && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    let normalizedLink: string | null = null;
    if (link !== undefined && link !== null && typeof link === "string" && link.trim() !== "") {
      try {
        new URL(link.trim());
        normalizedLink = link.trim();
      } catch {
        return NextResponse.json(
          { error: "Invalid purchase link URL" },
          { status: 400 }
        );
      }
    }

    if (eventId) {
      const event = await prisma.event.findFirst({
        where: { id: eventId, weddingId },
      });
      if (!event) {
        return NextResponse.json(
          { error: "Event not found" },
          { status: 400 }
        );
      }
    }

    const outfit = await prisma.outfitItem.create({
      data: {
        weddingId,
        name: name.trim(),
        type: type || "OUTFIT",
        eventId: eventId || null,
        cost: cost ?? null,
        status: status || "NOT_ORDERED",
        notes: notes?.trim() || null,
        link: normalizedLink,
      },
    });

    log.info("Outfit created", { outfitId: outfit.id, name: outfit.name, weddingId });

    return NextResponse.json(outfit, { status: 201 });
  } catch (err) {
    log.error("Failed to create outfit", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to create outfit" },
      { status: 500 }
    );
  }
}

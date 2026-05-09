import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/outfits/[id]");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to PATCH /api/outfits/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("PATCH /api/outfits/[id]", { outfitId: id, weddingId });

    const existing = await prisma.outfitItem.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Outfit item not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, type, eventId, cost, status, notes, link } = body;

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

    let normalizedLink: string | null | undefined = undefined;
    if (link !== undefined) {
      if (link === null || (typeof link === "string" && link.trim() === "")) {
        normalizedLink = null;
      } else if (typeof link === "string") {
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

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (type !== undefined) data.type = type;
    if (eventId !== undefined) data.eventId = eventId || null;
    if (cost !== undefined) data.cost = cost;
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes?.trim() || null;
    if (normalizedLink !== undefined) data.link = normalizedLink;

    const outfit = await prisma.outfitItem.update({
      where: { id },
      data,
    });

    log.info("Outfit updated", { outfitId: id, weddingId });

    return NextResponse.json(outfit);
  } catch (err) {
    log.error("Failed to update outfit item", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to update outfit item" },
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
      log.warn("Unauthorized access attempt to DELETE /api/outfits/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("DELETE /api/outfits/[id]", { outfitId: id, weddingId });

    const existing = await prisma.outfitItem.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Outfit item not found" },
        { status: 404 }
      );
    }

    await prisma.outfitItem.delete({ where: { id } });

    log.info("Outfit deleted", { outfitId: id, weddingId });

    return NextResponse.json({ message: "Outfit item deleted" });
  } catch (err) {
    log.error("Failed to delete outfit item", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to delete outfit item" },
      { status: 500 }
    );
  }
}

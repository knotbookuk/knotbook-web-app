import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/events/[id]");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to PATCH /api/events/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("PATCH /api/events/[id]", { eventId: id, weddingId });

    const existing = await prisma.event.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, date, startTime, endTime, venue, address, dayLabel, sortOrder } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined) data.description = description?.trim() || null;
    if (date !== undefined) {
      const newDate = new Date(date);
      data.date = newDate;
      if (existing.date.getTime() !== newDate.getTime()) {
        data.reminderSentAt = null;
      }
    }
    if (startTime !== undefined) data.startTime = startTime?.trim() || null;
    if (endTime !== undefined) data.endTime = endTime?.trim() || null;
    if (venue !== undefined) data.venue = venue?.trim() || null;
    if (address !== undefined) data.address = address?.trim() || null;
    if (dayLabel !== undefined) data.dayLabel = dayLabel?.trim() || null;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    const event = await prisma.event.update({
      where: { id },
      data,
    });

    log.info("Event updated", { eventId: id, weddingId });

    return NextResponse.json(event);
  } catch (err) {
    log.error("Failed to update event", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to update event" },
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
      log.warn("Unauthorized access attempt to DELETE /api/events/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("DELETE /api/events/[id]", { eventId: id, weddingId });

    const existing = await prisma.event.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    await prisma.event.delete({ where: { id } });

    log.info("Event deleted", { eventId: id, weddingId });

    return NextResponse.json({ message: "Event deleted" });
  } catch (err) {
    log.error("Failed to delete event", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    );
  }
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/events");

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/events");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("GET /api/events", { userId: session.user.id, weddingId });

    const events = await prisma.event.findMany({
      where: { weddingId },
      include: {
        outfits: true,
      },
      orderBy: [{ date: "asc" }, { sortOrder: "asc" }],
    });

    log.info("Fetched events", { count: events.length, weddingId });

    return NextResponse.json(events);
  } catch (err) {
    log.error("Failed to fetch events", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to POST /api/events");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("POST /api/events", { userId: session.user.id, weddingId });

    const body = await req.json();
    const { name, description, date, startTime, endTime, venue, address, dayLabel, sortOrder } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Event name is required" },
        { status: 400 }
      );
    }
    if (!date) {
      return NextResponse.json(
        { error: "Event date is required" },
        { status: 400 }
      );
    }

    const event = await prisma.event.create({
      data: {
        weddingId,
        name: name.trim(),
        description: description?.trim() || null,
        date: new Date(date),
        startTime: startTime?.trim() || null,
        endTime: endTime?.trim() || null,
        venue: venue?.trim() || null,
        address: address?.trim() || null,
        dayLabel: dayLabel?.trim() || null,
        sortOrder: sortOrder ?? 0,
      },
    });

    log.info("Event created", { eventId: event.id, name: event.name, weddingId });

    return NextResponse.json(event, { status: 201 });
  } catch (err) {
    log.error("Failed to create event", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to create event" },
      { status: 500 }
    );
  }
}

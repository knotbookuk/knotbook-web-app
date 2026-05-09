import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/seating");

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/seating");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("GET /api/seating", { userId: session.user.id, weddingId });

    const tables = await prisma.seatingTable.findMany({
      where: { weddingId },
      include: {
        guests: {
          select: {
            id: true,
            name: true,
            familySide: true,
            rsvpStatus: true,
            mealPreference: true,
          },
        },
        _count: { select: { guests: true } },
      },
      orderBy: { name: "asc" },
    });

    log.info("Fetched seating tables", { count: tables.length, weddingId });

    return NextResponse.json(tables);
  } catch (err) {
    log.error("Failed to fetch seating tables", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch seating tables" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to POST /api/seating");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("POST /api/seating", { userId: session.user.id, weddingId });

    const body = await req.json();
    const { name, capacity, shape, positionX, positionY } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Table name is required" },
        { status: 400 }
      );
    }

    const validShapes = ["ROUND", "RECTANGULAR"];
    const tableShape = validShapes.includes(shape) ? shape : "ROUND";

    const table = await prisma.seatingTable.create({
      data: {
        weddingId,
        name: name.trim(),
        capacity: capacity ?? 10,
        shape: tableShape,
        positionX: positionX ?? null,
        positionY: positionY ?? null,
      },
    });

    log.info("Seating table created", { tableId: table.id, name: table.name, weddingId });

    return NextResponse.json(table, { status: 201 });
  } catch (err) {
    log.error("Failed to create seating table", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to create seating table" },
      { status: 500 }
    );
  }
}

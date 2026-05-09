import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/seating/[id]");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to PATCH /api/seating/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("PATCH /api/seating/[id]", { tableId: id, weddingId });

    const existing = await prisma.seatingTable.findFirst({
      where: { id, weddingId },
      include: { _count: { select: { guests: true } } },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Seating table not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, capacity, shape, positionX, positionY } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();

    if (capacity !== undefined) {
      const newCap = Number(capacity);
      if (!Number.isFinite(newCap) || newCap < 1) {
        return NextResponse.json(
          { error: "Capacity must be a positive number" },
          { status: 400 }
        );
      }
      // Reject shrinking below the number of guests already at the table.
      // Otherwise we end up with `38/30 seats` and a "FULL" badge that
      // doesn't actually reflect reality.
      const currentGuests = existing._count.guests;
      if (newCap < currentGuests) {
        return NextResponse.json(
          {
            error: `Cannot reduce capacity to ${newCap} — ${currentGuests} guests are already assigned to this table. Remove ${currentGuests - newCap} guest${currentGuests - newCap === 1 ? "" : "s"} first, or pick a higher capacity.`,
            currentGuests,
            requested: newCap,
          },
          { status: 400 }
        );
      }
      data.capacity = newCap;
    }

    if (shape !== undefined) {
      const validShapes = ["ROUND", "RECTANGULAR"];
      if (validShapes.includes(shape)) data.shape = shape;
    }
    if (positionX !== undefined) data.positionX = positionX;
    if (positionY !== undefined) data.positionY = positionY;

    const table = await prisma.seatingTable.update({
      where: { id },
      data,
    });

    log.info("Seating table updated", { tableId: id, weddingId });

    return NextResponse.json(table);
  } catch (err) {
    log.error("Failed to update seating table", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to update seating table" },
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
      log.warn("Unauthorized access attempt to DELETE /api/seating/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("DELETE /api/seating/[id]", { tableId: id, weddingId });

    const existing = await prisma.seatingTable.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Seating table not found" },
        { status: 404 }
      );
    }

    await prisma.seatingTable.delete({ where: { id } });

    log.info("Seating table deleted", { tableId: id, weddingId });

    return NextResponse.json({ message: "Seating table deleted" });
  } catch (err) {
    log.error("Failed to delete seating table", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to delete seating table" },
      { status: 500 }
    );
  }
}

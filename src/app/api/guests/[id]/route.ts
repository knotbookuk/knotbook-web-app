import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/guests/[id]");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/guests/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("GET /api/guests/[id]", { guestId: id, weddingId });

    const guest = await prisma.guest.findFirst({
      where: { id, weddingId },
      include: {
        seatingTable: { select: { id: true, name: true } },
      },
    });

    if (!guest) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    log.info("Fetched guest", { guestId: id, weddingId });

    return NextResponse.json(guest);
  } catch (err) {
    log.error("Failed to fetch guest", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch guest" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to PATCH /api/guests/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("PATCH /api/guests/[id]", { guestId: id, weddingId });

    const existing = await prisma.guest.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, email, phone, familySide, rsvpStatus, mealPreference, dietaryType, allergies, allergySeverity, dietaryNotes, plusOne, plusOneName, plusOnes, notes, tableId } = body;

    if (tableId) {
      const table = await prisma.seatingTable.findFirst({
        where: { id: tableId, weddingId },
      });
      if (!table) {
        return NextResponse.json(
          { error: "Seating table not found" },
          { status: 400 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (email !== undefined) data.email = email?.trim() || null;
    if (phone !== undefined) data.phone = phone?.trim() || null;
    if (familySide !== undefined) data.familySide = familySide;
    if (rsvpStatus !== undefined) data.rsvpStatus = rsvpStatus;
    if (mealPreference !== undefined) data.mealPreference = mealPreference?.trim() || null;
    if (dietaryType !== undefined) data.dietaryType = dietaryType?.trim() || null;
    if (allergies !== undefined) data.allergies = allergies?.trim() || null;
    if (allergySeverity !== undefined) data.allergySeverity = allergySeverity || null;
    if (dietaryNotes !== undefined) data.dietaryNotes = dietaryNotes?.trim() || null;
    if (plusOne !== undefined) data.plusOne = plusOne;
    if (plusOneName !== undefined) data.plusOneName = plusOneName?.trim() || null;
    if (plusOnes !== undefined) data.plusOnes = typeof plusOnes === "number" ? plusOnes : 0;
    if (notes !== undefined) data.notes = notes?.trim() || null;
    if (tableId !== undefined) data.tableId = tableId || null;

    const guest = await prisma.guest.update({
      where: { id },
      data,
    });

    log.info("Guest updated", { guestId: id, weddingId });

    return NextResponse.json(guest);
  } catch (err) {
    log.error("Failed to update guest", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to update guest" },
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
      log.warn("Unauthorized access attempt to DELETE /api/guests/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("DELETE /api/guests/[id]", { guestId: id, weddingId });

    const existing = await prisma.guest.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    await prisma.guest.delete({ where: { id } });

    log.info("Guest deleted", { guestId: id, weddingId });

    return NextResponse.json({ message: "Guest deleted" });
  } catch (err) {
    log.error("Failed to delete guest", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to delete guest" },
      { status: 500 }
    );
  }
}

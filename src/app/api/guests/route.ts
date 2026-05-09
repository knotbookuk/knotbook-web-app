import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { randomUUID } from "crypto";

const log = createLogger("api/guests");

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/guests");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("GET /api/guests", { userId: session.user.id, weddingId });

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const rsvpStatus = searchParams.get("rsvpStatus");
    const familySide = searchParams.get("familySide");

    // Pagination params. When `paginate` is omitted we keep the legacy
    // "return everything" behaviour so existing callers (seating page,
    // dashboard stats, etc.) don't break.
    const paginate = searchParams.get("paginate") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const pageSize = Math.min(
      500,
      Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10) || 20),
    );

    const where: Record<string, unknown> = { weddingId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (rsvpStatus) {
      const validStatuses = ["ATTENDING", "NOT_COMING", "NO_RESPONSE"];
      if (validStatuses.includes(rsvpStatus)) {
        where.rsvpStatus = rsvpStatus;
      }
    }

    if (familySide) {
      const validSides = ["BRIDE", "GROOM", "MUTUAL"];
      if (validSides.includes(familySide)) {
        where.familySide = familySide;
      }
    }

    if (!paginate) {
      const guests = await prisma.guest.findMany({
        where,
        include: { seatingTable: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
      });
      log.info("Fetched guests (unpaginated)", { count: guests.length, weddingId });
      return NextResponse.json(guests);
    }

    // Stats are computed across the full filtered set, not just the current
    // page, so the cards/badges reflect the whole guest list.
    const [items, total, allForStats] = await Promise.all([
      prisma.guest.findMany({
        where,
        include: { seatingTable: { select: { id: true, name: true } } },
        orderBy: { name: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.guest.count({ where }),
      prisma.guest.findMany({
        where: { weddingId }, // un-filtered: stats describe the entire wedding
        select: {
          rsvpStatus: true,
          plusOnes: true,
          dietaryType: true,
          allergies: true,
          mealPreference: true,
        },
      }),
    ]);

    const stats = {
      totalGuests: allForStats.length,
      totalPlusOnes: allForStats.reduce((sum, g) => sum + (g.plusOnes ?? 0), 0),
      attending: allForStats.filter((g) => g.rsvpStatus === "ATTENDING").length,
      noResponse: allForStats.filter((g) => g.rsvpStatus === "NO_RESPONSE").length,
      dietaryFlags: allForStats.filter(
        (g) =>
          g.dietaryType ||
          g.allergies ||
          (g.mealPreference && g.mealPreference.toLowerCase() !== "standard"),
      ).length,
    };

    log.info("Fetched guests (paginated)", {
      count: items.length,
      total,
      page,
      pageSize,
      weddingId,
    });

    return NextResponse.json({ items, total, page, pageSize, stats });
  } catch (err) {
    log.error("Failed to fetch guests", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch guests" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to POST /api/guests");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("POST /api/guests", { userId: session.user.id, weddingId });

    const body = await req.json();
    const { name, email, phone, familySide, rsvpStatus, mealPreference, dietaryType, allergies, allergySeverity, dietaryNotes, plusOne, plusOneName, plusOnes, notes, tableId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Guest name is required" },
        { status: 400 }
      );
    }

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

    const guest = await prisma.guest.create({
      data: {
        weddingId,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        familySide: familySide || "MUTUAL",
        rsvpStatus: rsvpStatus || "NO_RESPONSE",
        mealPreference: mealPreference?.trim() || null,
        dietaryType: dietaryType?.trim() || null,
        allergies: allergies?.trim() || null,
        allergySeverity: allergySeverity || null,
        dietaryNotes: dietaryNotes?.trim() || null,
        plusOne: plusOne ?? false,
        plusOneName: plusOneName?.trim() || null,
        plusOnes: typeof plusOnes === "number" ? plusOnes : 0,
        notes: notes?.trim() || null,
        tableId: tableId || null,
        rsvpToken: randomUUID(),
      },
    });

    log.info("Guest created", { guestId: guest.id, weddingId });

    return NextResponse.json(guest, { status: 201 });
  } catch (err) {
    log.error("Failed to create guest", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to create guest" },
      { status: 500 }
    );
  }
}

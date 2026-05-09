import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/catering");

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/catering");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("GET /api/catering", { userId: session.user.id, weddingId });

    const [menuItems, menuBeverages, cateringNotes, wedding] = await Promise.all([
      prisma.menuItem.findMany({
        where: { weddingId },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      }),
      prisma.menuBeverage.findMany({
        where: { weddingId },
        orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      }),
      prisma.cateringNote.findMany({
        where: { weddingId },
        orderBy: { createdAt: "desc" },
      }),
      prisma.wedding.findUnique({
        where: { id: weddingId },
        select: { culturalStyle: true },
      }),
    ]);

    log.info("Fetched catering data", {
      menuItems: menuItems.length,
      beverages: menuBeverages.length,
      notes: cateringNotes.length,
      weddingId,
    });

    return NextResponse.json({
      menuItems,
      menuBeverages,
      cateringNotes,
      culturalStyle: wedding?.culturalStyle ?? "CLASSIC_BRITISH",
    });
  } catch (err) {
    log.error("Failed to fetch catering data", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch catering data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to POST /api/catering");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("POST /api/catering", { userId: session.user.id, weddingId });

    const body = await req.json();
    const { type } = body;

    if (type === "food") {
      const { name, category, description, isVegetarian, isVegan, isGlutenFree, notes } = body;
      if (!name?.trim() || !category) {
        return NextResponse.json({ error: "Name and category are required" }, { status: 400 });
      }

      const item = await prisma.menuItem.create({
        data: {
          weddingId,
          name: name.trim(),
          category,
          description: description?.trim() || null,
          isVegetarian: isVegetarian ?? false,
          isVegan: isVegan ?? false,
          isGlutenFree: isGlutenFree ?? false,
          notes: notes?.trim() || null,
        },
      });

      log.info("Menu item created", { itemId: item.id, name: item.name, weddingId });
      return NextResponse.json(item, { status: 201 });
    }

    if (type === "beverage") {
      const { name, category, description, vendor, isAlcoholic, notes } = body;
      if (!name?.trim() || !category) {
        return NextResponse.json({ error: "Name and category are required" }, { status: 400 });
      }

      const item = await prisma.menuBeverage.create({
        data: {
          weddingId,
          name: name.trim(),
          category,
          description: description?.trim() || null,
          vendor: vendor?.trim() || null,
          isAlcoholic: isAlcoholic ?? category !== "NON_ALCOHOLIC",
          notes: notes?.trim() || null,
        },
      });

      log.info("Beverage created", { itemId: item.id, name: item.name, weddingId });
      return NextResponse.json(item, { status: 201 });
    }

    if (type === "note") {
      const { content } = body;
      if (!content?.trim()) {
        return NextResponse.json({ error: "Content is required" }, { status: 400 });
      }

      const note = await prisma.cateringNote.create({
        data: {
          weddingId,
          content: content.trim(),
        },
      });

      log.info("Catering note created", { noteId: note.id, weddingId });
      return NextResponse.json(note, { status: 201 });
    }

    return NextResponse.json({ error: "Invalid type. Must be food, beverage, or note" }, { status: 400 });
  } catch (err) {
    log.error("Failed to create catering item", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to create catering item" },
      { status: 500 }
    );
  }
}

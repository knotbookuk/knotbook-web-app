import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/catering/[id]");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to PATCH /api/catering/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    log.debug("PATCH /api/catering/[id]", { itemId: id, type, weddingId });

    if (type === "food") {
      const existing = await prisma.menuItem.findFirst({
        where: { id, weddingId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
      }

      const body = await req.json();
      const { name, category, description, isVegetarian, isVegan, isGlutenFree, notes } = body;

      const data: Record<string, unknown> = {};
      if (name !== undefined) data.name = name.trim();
      if (category !== undefined) data.category = category;
      if (description !== undefined) data.description = description?.trim() || null;
      if (isVegetarian !== undefined) data.isVegetarian = isVegetarian;
      if (isVegan !== undefined) data.isVegan = isVegan;
      if (isGlutenFree !== undefined) data.isGlutenFree = isGlutenFree;
      if (notes !== undefined) data.notes = notes?.trim() || null;

      const item = await prisma.menuItem.update({
        where: { id },
        data,
      });

      log.info("Menu item updated", { itemId: id, weddingId });
      return NextResponse.json(item);
    }

    if (type === "beverage") {
      const existing = await prisma.menuBeverage.findFirst({
        where: { id, weddingId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Beverage not found" }, { status: 404 });
      }

      const body = await req.json();
      const { name, category, description, vendor, isAlcoholic, notes } = body;

      const data: Record<string, unknown> = {};
      if (name !== undefined) data.name = name.trim();
      if (category !== undefined) data.category = category;
      if (description !== undefined) data.description = description?.trim() || null;
      if (vendor !== undefined) data.vendor = vendor?.trim() || null;
      if (isAlcoholic !== undefined) data.isAlcoholic = !!isAlcoholic;
      if (notes !== undefined) data.notes = notes?.trim() || null;

      const item = await prisma.menuBeverage.update({
        where: { id },
        data,
      });

      log.info("Beverage updated", { itemId: id, weddingId });
      return NextResponse.json(item);
    }

    if (type === "note") {
      const existing = await prisma.cateringNote.findFirst({
        where: { id, weddingId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Catering note not found" }, { status: 404 });
      }

      const body = await req.json();
      const { content } = body;

      if (!content?.trim()) {
        return NextResponse.json({ error: "Content is required" }, { status: 400 });
      }

      const note = await prisma.cateringNote.update({
        where: { id },
        data: { content: content.trim() },
      });

      log.info("Catering note updated", { noteId: id, weddingId });
      return NextResponse.json(note);
    }

    return NextResponse.json({ error: "Invalid type query param. Must be food, beverage, or note" }, { status: 400 });
  } catch (err) {
    log.error("Failed to update catering item", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to update catering item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to DELETE /api/catering/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    log.debug("DELETE /api/catering/[id]", { itemId: id, type, weddingId });

    if (type === "food") {
      const existing = await prisma.menuItem.findFirst({
        where: { id, weddingId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
      }

      await prisma.menuItem.delete({ where: { id } });
      log.info("Menu item deleted", { itemId: id, weddingId });
      return NextResponse.json({ message: "Menu item deleted" });
    }

    if (type === "beverage") {
      const existing = await prisma.menuBeverage.findFirst({
        where: { id, weddingId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Beverage not found" }, { status: 404 });
      }

      await prisma.menuBeverage.delete({ where: { id } });
      log.info("Beverage deleted", { itemId: id, weddingId });
      return NextResponse.json({ message: "Beverage deleted" });
    }

    if (type === "note") {
      const existing = await prisma.cateringNote.findFirst({
        where: { id, weddingId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Catering note not found" }, { status: 404 });
      }

      await prisma.cateringNote.delete({ where: { id } });
      log.info("Catering note deleted", { noteId: id, weddingId });
      return NextResponse.json({ message: "Catering note deleted" });
    }

    return NextResponse.json({ error: "Invalid type query param. Must be food, beverage, or note" }, { status: 400 });
  } catch (err) {
    log.error("Failed to delete catering item", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to delete catering item" },
      { status: 500 }
    );
  }
}

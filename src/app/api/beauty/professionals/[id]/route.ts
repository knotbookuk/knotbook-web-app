import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/beauty/professionals/[id]");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to PATCH /api/beauty/professionals/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("PATCH /api/beauty/professionals/[id]", { id, weddingId });

    const existing = await prisma.beautyProfessional.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Professional not found" }, { status: 404 });
    }

    const body = await req.json();
    const { name, type, email, phone, website, instagram, notes, cost } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (type !== undefined) {
      if (!["MUA", "HAIRSTYLIST"].includes(type)) {
        return NextResponse.json({ error: "Type must be MUA or HAIRSTYLIST" }, { status: 400 });
      }
      data.type = type;
    }
    if (email !== undefined) data.email = email?.trim() || null;
    if (phone !== undefined) data.phone = phone?.trim() || null;
    if (website !== undefined) data.website = website?.trim() || null;
    if (instagram !== undefined) data.instagram = instagram?.trim() || null;
    if (notes !== undefined) data.notes = notes?.trim() || null;
    if (cost !== undefined) data.cost = cost != null ? cost : null;

    const professional = await prisma.beautyProfessional.update({
      where: { id },
      data,
    });

    log.info("Beauty professional updated", { id, weddingId });

    return NextResponse.json(professional);
  } catch (err) {
    log.error("Failed to update beauty professional", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to update beauty professional" },
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
      log.warn("Unauthorized access attempt to DELETE /api/beauty/professionals/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("DELETE /api/beauty/professionals/[id]", { id, weddingId });

    const existing = await prisma.beautyProfessional.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Professional not found" }, { status: 404 });
    }

    await prisma.beautyProfessional.delete({ where: { id } });

    log.info("Beauty professional deleted", { id, weddingId });

    return NextResponse.json({ message: "Professional deleted" });
  } catch (err) {
    log.error("Failed to delete beauty professional", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to delete beauty professional" },
      { status: 500 }
    );
  }
}

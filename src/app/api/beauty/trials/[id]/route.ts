import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/beauty/trials/[id]");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to PATCH /api/beauty/trials/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("PATCH /api/beauty/trials/[id]", { id, weddingId });

    // Join through professional to verify ownership
    const existing = await prisma.beautyTrial.findFirst({
      where: { id, professional: { weddingId } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Trial not found" }, { status: 404 });
    }

    const body = await req.json();
    const { professionalId, date, location, notes, outcome } = body;

    const data: Record<string, unknown> = {};

    if (professionalId !== undefined) {
      // Verify new professional belongs to this wedding
      const prof = await prisma.beautyProfessional.findFirst({
        where: { id: professionalId, weddingId },
      });
      if (!prof) {
        return NextResponse.json({ error: "Professional not found" }, { status: 404 });
      }
      data.professionalId = professionalId;
    }
    if (date !== undefined) data.date = new Date(date);
    if (location !== undefined) data.location = location?.trim() || null;
    if (notes !== undefined) data.notes = notes?.trim() || null;
    if (outcome !== undefined) data.outcome = outcome?.trim() || null;

    const trial = await prisma.beautyTrial.update({
      where: { id },
      data,
      include: {
        professional: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    log.info("Beauty trial updated", { id, weddingId });

    return NextResponse.json(trial);
  } catch (err) {
    log.error("Failed to update beauty trial", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to update beauty trial" },
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
      log.warn("Unauthorized access attempt to DELETE /api/beauty/trials/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("DELETE /api/beauty/trials/[id]", { id, weddingId });

    // Join through professional to verify ownership
    const existing = await prisma.beautyTrial.findFirst({
      where: { id, professional: { weddingId } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Trial not found" }, { status: 404 });
    }

    await prisma.beautyTrial.delete({ where: { id } });

    log.info("Beauty trial deleted", { id, weddingId });

    return NextResponse.json({ message: "Trial deleted" });
  } catch (err) {
    log.error("Failed to delete beauty trial", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to delete beauty trial" },
      { status: 500 }
    );
  }
}

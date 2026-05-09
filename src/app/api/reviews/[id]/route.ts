import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/reviews/[id]");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.location !== undefined)
      data.location = body.location ? String(body.location).trim() : null;
    if (body.rating !== undefined) {
      const r = Number(body.rating);
      if (!Number.isFinite(r) || r < 1 || r > 5) {
        return NextResponse.json(
          { error: "Rating must be between 1 and 5" },
          { status: 400 }
        );
      }
      data.rating = Math.round(r);
    }
    if (body.quote !== undefined) data.quote = String(body.quote).trim();
    if (body.sortOrder !== undefined) data.sortOrder = Number(body.sortOrder) || 0;
    if (body.isVisible !== undefined) data.isVisible = !!body.isVisible;

    const review = await prisma.review.update({ where: { id }, data });
    log.info("Review updated", { id });
    return NextResponse.json(review);
  } catch (err) {
    log.error("Failed to update review", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.review.delete({ where: { id } });
    log.info("Review deleted", { id });
    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("Failed to delete review", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
  }
}

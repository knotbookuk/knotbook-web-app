import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/beauty/inspiration");

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/beauty/inspiration");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("GET /api/beauty/inspiration", { userId: session.user.id, weddingId });

    const items = await prisma.beautyInspiration.findMany({
      where: { weddingId },
      orderBy: { createdAt: "desc" },
    });

    log.info("Fetched beauty inspiration", { count: items.length, weddingId });

    return NextResponse.json(items);
  } catch (err) {
    log.error("Failed to fetch beauty inspiration", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch beauty inspiration" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to POST /api/beauty/inspiration");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("POST /api/beauty/inspiration", { userId: session.user.id, weddingId });

    const body = await req.json();
    const { imageUrl, caption } = body;

    if (!imageUrl?.trim()) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
    }

    const existingCount = await prisma.beautyInspiration.count({ where: { weddingId } });
    if (existingCount >= 30) {
      return NextResponse.json(
        { error: "Inspiration Gallery is limited to 30 images. Remove some before adding more." },
        { status: 400 }
      );
    }

    const item = await prisma.beautyInspiration.create({
      data: {
        weddingId,
        imageUrl: imageUrl.trim(),
        caption: caption?.trim() || null,
      },
    });

    log.info("Beauty inspiration created", { id: item.id, weddingId });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    log.error("Failed to create beauty inspiration", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to create beauty inspiration" },
      { status: 500 }
    );
  }
}

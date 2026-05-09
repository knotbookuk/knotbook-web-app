import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/beauty/professionals");

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/beauty/professionals");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("GET /api/beauty/professionals", { userId: session.user.id, weddingId });

    const professionals = await prisma.beautyProfessional.findMany({
      where: { weddingId },
      include: { trials: true },
      orderBy: { createdAt: "desc" },
    });

    log.info("Fetched beauty professionals", { count: professionals.length, weddingId });

    return NextResponse.json(professionals);
  } catch (err) {
    log.error("Failed to fetch beauty professionals", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch beauty professionals" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to POST /api/beauty/professionals");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("POST /api/beauty/professionals", { userId: session.user.id, weddingId });

    const body = await req.json();
    const { name, type, email, phone, website, instagram, notes, cost } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!type || !["MUA", "HAIRSTYLIST"].includes(type)) {
      return NextResponse.json({ error: "Type must be MUA or HAIRSTYLIST" }, { status: 400 });
    }

    const professional = await prisma.beautyProfessional.create({
      data: {
        weddingId,
        name: name.trim(),
        type,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        website: website?.trim() || null,
        instagram: instagram?.trim() || null,
        notes: notes?.trim() || null,
        cost: cost != null ? cost : null,
      },
    });

    log.info("Beauty professional created", { id: professional.id, name: professional.name, type, weddingId });

    return NextResponse.json(professional, { status: 201 });
  } catch (err) {
    log.error("Failed to create beauty professional", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to create beauty professional" },
      { status: 500 }
    );
  }
}

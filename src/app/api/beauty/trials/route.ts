import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/beauty/trials");

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/beauty/trials");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("GET /api/beauty/trials", { userId: session.user.id, weddingId });

    // Join through professional to verify ownership
    const trials = await prisma.beautyTrial.findMany({
      where: {
        professional: { weddingId },
      },
      include: {
        professional: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: { date: "asc" },
    });

    log.info("Fetched beauty trials", { count: trials.length, weddingId });

    return NextResponse.json(trials);
  } catch (err) {
    log.error("Failed to fetch beauty trials", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch beauty trials" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to POST /api/beauty/trials");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("POST /api/beauty/trials", { userId: session.user.id, weddingId });

    const body = await req.json();
    const { professionalId, date, location, notes, outcome } = body;

    if (!professionalId) {
      return NextResponse.json({ error: "Professional is required" }, { status: 400 });
    }
    if (!date) {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    // Verify the professional belongs to this wedding
    const professional = await prisma.beautyProfessional.findFirst({
      where: { id: professionalId, weddingId },
    });
    if (!professional) {
      return NextResponse.json({ error: "Professional not found" }, { status: 404 });
    }

    const trial = await prisma.beautyTrial.create({
      data: {
        professionalId,
        date: new Date(date),
        location: location?.trim() || null,
        notes: notes?.trim() || null,
        outcome: outcome?.trim() || null,
      },
      include: {
        professional: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    log.info("Beauty trial created", { id: trial.id, professionalId, weddingId });

    return NextResponse.json(trial, { status: 201 });
  } catch (err) {
    log.error("Failed to create beauty trial", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to create beauty trial" },
      { status: 500 }
    );
  }
}

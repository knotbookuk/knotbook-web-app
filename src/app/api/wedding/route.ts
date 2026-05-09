import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { recheckBudgetAlerts } from "@/lib/budget-alerts";

const log = createLogger("api/wedding");

function sanitizeThresholds(input: unknown): number[] | null {
  if (!Array.isArray(input)) return null;
  const cleaned = input
    .map((v) => (typeof v === "string" ? Number(v) : v))
    .filter(
      (v): v is number =>
        typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 1000,
    )
    .map((v) => Math.round(v));
  // Dedupe + sort ascending so storage is canonical.
  return Array.from(new Set(cleaned)).sort((a, b) => a - b);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/wedding");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding selected" }, { status: 404 });
    }

    log.debug("GET /api/wedding", { weddingId });

    const wedding = await prisma.wedding.findUnique({
      where: { id: weddingId },
      include: {
        _count: {
          select: {
            events: true,
            guests: true,
            tasks: true,
          },
        },
      },
    });

    if (!wedding) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const taskStats = await prisma.task.groupBy({
      by: ["status"],
      where: { weddingId: wedding.id },
      _count: { status: true },
    });

    log.info("Fetched wedding", { weddingId: wedding.id });

    return NextResponse.json({
      ...wedding,
      taskStats: taskStats.reduce(
        (acc, t) => ({ ...acc, [t.status]: t._count.status }),
        {} as Record<string, number>
      ),
    });
  } catch (err) {
    log.error("Failed to fetch wedding", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch wedding" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to POST /api/wedding");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    log.debug("POST /api/wedding", { userId });

    // Only enforce single-wedding for couples
    if (session.user.userType !== "PLANNER") {
      const existing = await prisma.wedding.findFirst({
        where: { userId },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Wedding already exists for this user" },
          { status: 409 }
        );
      }
    }

    const body = await req.json();
    const { culturalStyle, weddingDate, partnerName1, partnerName2, totalBudget, venue, notes } = body;

    if (!culturalStyle || !partnerName1 || !partnerName2) {
      return NextResponse.json(
        { error: "culturalStyle, partnerName1, and partnerName2 are required" },
        { status: 400 }
      );
    }

    const validStyles = ["CLASSIC_BRITISH", "CLASSIC_ASIAN", "ARAB"];
    if (!validStyles.includes(culturalStyle)) {
      return NextResponse.json(
        { error: `culturalStyle must be one of: ${validStyles.join(", ")}` },
        { status: 400 }
      );
    }

    const wedding = await prisma.wedding.create({
      data: {
        userId,
        culturalStyle,
        weddingDate: weddingDate ? new Date(weddingDate) : null,
        partnerName1: partnerName1.trim(),
        partnerName2: partnerName2.trim(),
        totalBudget: totalBudget ?? 0,
        venue: venue?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    log.info("Wedding created", { weddingId: wedding.id, userId, culturalStyle });

    return NextResponse.json(wedding, { status: 201 });
  } catch (err) {
    log.error("Failed to create wedding", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to create wedding" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to PATCH /api/wedding");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("PATCH /api/wedding", { weddingId });

    const body = await req.json();
    const { culturalStyle, weddingDate, partnerName1, partnerName2, totalBudget, venue, notes, budgetAlertThresholds } = body;

    if (culturalStyle) {
      const validStyles = ["CLASSIC_BRITISH", "CLASSIC_ASIAN", "ARAB"];
      if (!validStyles.includes(culturalStyle)) {
        return NextResponse.json(
          { error: `culturalStyle must be one of: ${validStyles.join(", ")}` },
          { status: 400 }
        );
      }
    }

    let cleanedThresholds: number[] | null = null;
    if (budgetAlertThresholds !== undefined) {
      cleanedThresholds = sanitizeThresholds(budgetAlertThresholds);
      if (cleanedThresholds === null) {
        return NextResponse.json(
          { error: "budgetAlertThresholds must be an array of percentages between 1 and 1000" },
          { status: 400 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (culturalStyle !== undefined) data.culturalStyle = culturalStyle;
    if (weddingDate !== undefined) data.weddingDate = weddingDate ? new Date(weddingDate) : null;
    if (partnerName1 !== undefined) data.partnerName1 = partnerName1.trim();
    if (partnerName2 !== undefined) data.partnerName2 = partnerName2.trim();
    if (totalBudget !== undefined) data.totalBudget = totalBudget;
    if (venue !== undefined) data.venue = venue?.trim() || null;
    if (notes !== undefined) data.notes = notes?.trim() || null;
    if (cleanedThresholds !== null) data.budgetAlertThresholds = cleanedThresholds;

    const wedding = await prisma.wedding.update({
      where: { id: weddingId },
      data,
    });

    log.info("Wedding updated", { weddingId });

    // If totalBudget OR thresholds changed, the percent calculation moves
    // and previously-tripped thresholds may need to be untripped (or vice versa).
    if (totalBudget !== undefined || cleanedThresholds !== null) {
      await recheckBudgetAlerts(weddingId);
    }

    return NextResponse.json(wedding);
  } catch (err) {
    log.error("Failed to update wedding", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to update wedding" },
      { status: 500 }
    );
  }
}

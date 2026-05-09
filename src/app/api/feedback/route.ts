import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/feedback");

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/feedback");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    log.debug("GET /api/feedback", { userId: session.user.id });

    const items = await prisma.feedback.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    log.info("Fetched feedback items", { count: items.length, userId: session.user.id });

    return NextResponse.json(items);
  } catch (err) {
    log.error("Failed to fetch feedback", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch feedback" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to POST /api/feedback");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    log.debug("POST /api/feedback", { userId: session.user.id });

    const body = await req.json();
    const { featureArea, rating, message, screenshotUrl } = body;

    // Validate required fields
    if (!featureArea || typeof featureArea !== "string") {
      return NextResponse.json(
        { error: "featureArea is required" },
        { status: 400 }
      );
    }

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "rating must be a number between 1 and 5" },
        { status: 400 }
      );
    }

    const item = await prisma.feedback.create({
      data: {
        userId: session.user.id,
        featureArea: featureArea.trim(),
        rating,
        message: message.trim(),
        screenshotUrl: screenshotUrl?.trim() || null,
      },
    });

    log.info("Feedback created", { feedbackId: item.id, featureArea, rating, userId: session.user.id });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    log.error("Failed to create feedback", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to create feedback" },
      { status: 500 }
    );
  }
}

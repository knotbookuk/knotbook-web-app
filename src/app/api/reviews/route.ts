import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/reviews");

export async function GET() {
  try {
    const reviews = await prisma.review.findMany({
      where: { isVisible: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(reviews);
  } catch (err) {
    log.error("Failed to fetch reviews", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, location, rating, quote, sortOrder, isVisible } = body;

    if (!name?.trim() || !quote?.trim()) {
      return NextResponse.json(
        { error: "Name and quote are required" },
        { status: 400 }
      );
    }

    const ratingNum = Number(rating);
    if (!Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json(
        { error: "Rating must be between 1 and 5" },
        { status: 400 }
      );
    }

    const review = await prisma.review.create({
      data: {
        name: name.trim(),
        location: location?.trim() || null,
        rating: Math.round(ratingNum),
        quote: quote.trim(),
        sortOrder: Number(sortOrder) || 0,
        isVisible: isVisible !== false,
      },
    });

    log.info("Review created", { id: review.id });
    return NextResponse.json(review, { status: 201 });
  } catch (err) {
    log.error("Failed to create review", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}

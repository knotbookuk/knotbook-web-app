import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/vendors");

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/vendors");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("GET /api/vendors", { userId: session.user.id, weddingId });

    const vendors = await prisma.vendor.findMany({
      where: { weddingId },
      include: {
        payments: {
          orderBy: { dueDate: "asc" },
        },
        _count: { select: { payments: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    log.info("Fetched vendors", { count: vendors.length, weddingId });

    return NextResponse.json(vendors);
  } catch (err) {
    log.error("Failed to fetch vendors", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch vendors" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to POST /api/vendors");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    log.debug("POST /api/vendors", { userId: session.user.id, weddingId });

    const body = await req.json();
    const { name, category, contactName, email, phone, website, quoteAmount, depositAmount, rating, status, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Vendor name is required" },
        { status: 400 }
      );
    }
    if (!category || !category.trim()) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    const vendor = await prisma.vendor.create({
      data: {
        weddingId,
        name: name.trim(),
        category: category.trim(),
        contactName: contactName?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        website: website?.trim() || null,
        quoteAmount: quoteAmount ?? null,
        depositAmount: depositAmount ?? null,
        rating: rating ?? null,
        status: status || "CONTACTED",
        notes: notes?.trim() || null,
      },
    });

    log.info("Vendor created", { vendorId: vendor.id, category: vendor.category, weddingId });

    return NextResponse.json(vendor, { status: 201 });
  } catch (err) {
    log.error("Failed to create vendor", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to create vendor" },
      { status: 500 }
    );
  }
}

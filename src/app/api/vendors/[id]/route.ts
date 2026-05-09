import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/vendors/[id]");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to PATCH /api/vendors/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("PATCH /api/vendors/[id]", { vendorId: id, weddingId });

    const existing = await prisma.vendor.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { name, category, contactName, email, phone, website, quoteAmount, depositAmount, rating, status, notes } = body;

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (category !== undefined) data.category = category.trim();
    if (contactName !== undefined) data.contactName = contactName?.trim() || null;
    if (email !== undefined) data.email = email?.trim() || null;
    if (phone !== undefined) data.phone = phone?.trim() || null;
    if (website !== undefined) data.website = website?.trim() || null;
    if (quoteAmount !== undefined) data.quoteAmount = quoteAmount;
    if (depositAmount !== undefined) data.depositAmount = depositAmount;
    if (rating !== undefined) data.rating = rating;
    if (status !== undefined) data.status = status;
    if (notes !== undefined) data.notes = notes?.trim() || null;

    const vendor = await prisma.vendor.update({
      where: { id },
      data,
    });

    log.info("Vendor updated", { vendorId: id, weddingId });

    return NextResponse.json(vendor);
  } catch (err) {
    log.error("Failed to update vendor", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to update vendor" },
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
      log.warn("Unauthorized access attempt to DELETE /api/vendors/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("DELETE /api/vendors/[id]", { vendorId: id, weddingId });

    const existing = await prisma.vendor.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    await prisma.vendor.delete({ where: { id } });

    log.info("Vendor deleted", { vendorId: id, weddingId });

    return NextResponse.json({ message: "Vendor deleted" });
  } catch (err) {
    log.error("Failed to delete vendor", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to delete vendor" },
      { status: 500 }
    );
  }
}

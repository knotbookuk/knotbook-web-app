import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/vendors/[id]/payments");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/vendors/[id]/payments");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id: vendorId } = await params;

    log.debug("GET /api/vendors/[id]/payments", { vendorId, weddingId });

    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, weddingId },
    });
    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    const payments = await prisma.vendorPayment.findMany({
      where: { vendorId },
      orderBy: { dueDate: "asc" },
    });

    log.info("Fetched vendor payments", { count: payments.length, vendorId, weddingId });

    return NextResponse.json(payments);
  } catch (err) {
    log.error("Failed to fetch payments", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to POST /api/vendors/[id]/payments");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id: vendorId } = await params;

    log.debug("POST /api/vendors/[id]/payments", { vendorId, weddingId });

    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, weddingId },
    });
    if (!vendor) {
      return NextResponse.json(
        { error: "Vendor not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { amount, description, dueDate, paidDate, status } = body;

    if (amount === undefined || amount === null) {
      return NextResponse.json(
        { error: "Amount is required" },
        { status: 400 }
      );
    }
    if (!dueDate) {
      return NextResponse.json(
        { error: "Due date is required" },
        { status: 400 }
      );
    }

    const payment = await prisma.vendorPayment.create({
      data: {
        vendorId,
        amount,
        description: description?.trim() || null,
        dueDate: new Date(dueDate),
        paidDate: paidDate ? new Date(paidDate) : null,
        status: status || "PENDING",
      },
    });

    log.info("Vendor payment created", { paymentId: payment.id, vendorId, amount, weddingId });

    return NextResponse.json(payment, { status: 201 });
  } catch (err) {
    log.error("Failed to create payment", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}

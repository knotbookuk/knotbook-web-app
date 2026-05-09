import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/vendors/[id]/payments/[paymentId]");

/**
 * Verify the payment belongs to the active wedding by joining through the
 * vendor. Prevents cross-wedding access via guessed payment IDs.
 */
async function loadOwnedPayment(
  paymentId: string,
  vendorId: string,
  weddingId: string
) {
  return prisma.vendorPayment.findFirst({
    where: {
      id: paymentId,
      vendorId,
      vendor: { weddingId },
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to PATCH");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id: vendorId, paymentId } = await params;

    const existing = await loadOwnedPayment(paymentId, vendorId, weddingId);
    if (!existing) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const body = await req.json();
    const { amount, description, dueDate, paidDate, status } = body;

    const data: Record<string, unknown> = {};
    if (amount !== undefined) data.amount = amount;
    if (description !== undefined) data.description = description?.trim() || null;
    if (paidDate !== undefined) data.paidDate = paidDate ? new Date(paidDate) : null;
    if (status !== undefined) data.status = status;

    // Re-arm the reminder if the due date changes — same pattern as Task and
    // Event PATCH handlers. Compare ms-values so identical dates don't reset.
    if (dueDate !== undefined) {
      const newDue = dueDate ? new Date(dueDate) : null;
      const newMs = newDue?.getTime() ?? null;
      const oldMs = existing.dueDate?.getTime() ?? null;
      if (newDue) data.dueDate = newDue;
      if (newMs !== oldMs) data.reminderSentAt = null;
    }

    const payment = await prisma.vendorPayment.update({
      where: { id: paymentId },
      data,
    });

    log.info("Vendor payment updated", {
      paymentId,
      vendorId,
      weddingId,
      reminderRearmed: data.reminderSentAt === null,
    });

    return NextResponse.json(payment);
  } catch (err) {
    log.error("Failed to update payment", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to update payment" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to DELETE");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id: vendorId, paymentId } = await params;

    const existing = await loadOwnedPayment(paymentId, vendorId, weddingId);
    if (!existing) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    await prisma.vendorPayment.delete({ where: { id: paymentId } });

    log.info("Vendor payment deleted", { paymentId, vendorId, weddingId });

    return NextResponse.json({ message: "Payment deleted" });
  } catch (err) {
    log.error("Failed to delete payment", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to delete payment" },
      { status: 500 }
    );
  }
}

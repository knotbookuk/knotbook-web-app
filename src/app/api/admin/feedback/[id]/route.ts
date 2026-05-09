import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/admin/feedback/[id]");

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    log.debug("PATCH /api/admin/feedback/[id]", { feedbackId: id, body });

    // Only allow specific fields to be updated
    const allowedFields: Record<string, unknown> = {};
    if (body.isRead !== undefined) allowedFields.isRead = Boolean(body.isRead);
    if (body.adminNotes !== undefined) allowedFields.adminNotes = body.adminNotes?.trim() || null;

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updated = await prisma.feedback.update({
      where: { id },
      data: allowedFields,
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    log.info("Updated feedback", { feedbackId: id, fields: Object.keys(allowedFields) });
    return NextResponse.json(updated);
  } catch (err) {
    log.error("Failed to update feedback", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to update feedback" },
      { status: 500 }
    );
  }
}

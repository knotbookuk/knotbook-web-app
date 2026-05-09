import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/planner/clients/[id]");

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.userType !== "PLANNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    // Verify the wedding belongs to this planner
    const existing = await prisma.wedding.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }

    const body = await req.json();
    const { clientName, partnerName1, partnerName2, weddingDate, culturalStyle, totalBudget } = body;

    const data: Record<string, unknown> = {};
    if (clientName !== undefined) data.clientName = clientName?.trim() || null;
    if (partnerName1 !== undefined) data.partnerName1 = partnerName1.trim();
    if (partnerName2 !== undefined) data.partnerName2 = partnerName2.trim();
    if (weddingDate !== undefined) data.weddingDate = weddingDate ? new Date(weddingDate) : null;
    if (culturalStyle !== undefined) {
      const validStyles = ["CLASSIC_BRITISH", "CLASSIC_ASIAN", "ARAB"];
      if (validStyles.includes(culturalStyle)) data.culturalStyle = culturalStyle;
    }
    if (totalBudget !== undefined) data.totalBudget = totalBudget;

    const wedding = await prisma.wedding.update({
      where: { id },
      data,
    });

    log.info("Client wedding updated", { weddingId: id, userId: session.user.id });
    return NextResponse.json(wedding);
  } catch (err) {
    log.error("Failed to update client wedding", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to update client wedding" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.userType !== "PLANNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;

    // Verify the wedding belongs to this planner
    const existing = await prisma.wedding.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }

    await prisma.wedding.delete({ where: { id } });

    log.info("Client wedding deleted", { weddingId: id, userId: session.user.id });
    return NextResponse.json({ success: true, wasActive: id === session.user.weddingId });
  } catch (err) {
    log.error("Failed to delete client wedding", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to delete client wedding" }, { status: 500 });
  }
}

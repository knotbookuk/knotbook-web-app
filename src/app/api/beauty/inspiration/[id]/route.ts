import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/beauty/inspiration/[id]");

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to DELETE /api/beauty/inspiration/[id]");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const { id } = await params;

    log.debug("DELETE /api/beauty/inspiration/[id]", { id, weddingId });

    const existing = await prisma.beautyInspiration.findFirst({
      where: { id, weddingId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Inspiration not found" }, { status: 404 });
    }

    await prisma.beautyInspiration.delete({ where: { id } });

    log.info("Beauty inspiration deleted", { id, weddingId });

    return NextResponse.json({ message: "Inspiration deleted" });
  } catch (err) {
    log.error("Failed to delete beauty inspiration", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to delete beauty inspiration" },
      { status: 500 }
    );
  }
}

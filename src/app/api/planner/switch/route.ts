import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/planner/switch");

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.userType !== "PLANNER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { weddingId } = await req.json();

    if (!weddingId) {
      // Clear active wedding — go back to planner overview
      await prisma.user.update({
        where: { id: session.user.id },
        data: { activeWeddingId: null },
      });
      return NextResponse.json({ success: true });
    }

    // Verify the wedding belongs to this planner
    const wedding = await prisma.wedding.findFirst({
      where: { id: weddingId, userId: session.user.id },
    });

    if (!wedding) {
      return NextResponse.json({ error: "Wedding not found" }, { status: 404 });
    }

    // Set as active wedding
    await prisma.user.update({
      where: { id: session.user.id },
      data: { activeWeddingId: weddingId },
    });

    log.info("Planner switched active wedding", { userId: session.user.id, weddingId });
    return NextResponse.json({ success: true, clientName: wedding.clientName || `${wedding.partnerName1} & ${wedding.partnerName2}` });
  } catch (err) {
    log.error("Failed to switch wedding", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to switch wedding" }, { status: 500 });
  }
}

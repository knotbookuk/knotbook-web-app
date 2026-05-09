import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { seedUserData } from "@/lib/admin-seed";
import { createLogger } from "@/lib/logger";
import { NextResponse } from "next/server";

const log = createLogger("api/admin/users/[id]/seed");

/* ─── POST: Replace user's wedding with rich test data ─── */

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
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
    log.debug("POST /api/admin/users/[id]/seed", { targetUserId: id });

    // Verify the target user exists (don't seed against a deleted ID).
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Wrap delete-then-seed in a single transaction so partial failures
    // roll back. Bumped maxWait + timeout because the seed writes ~80 rows.
    const summary = await prisma.$transaction(
      async (tx) => {
        // Cascade-delete any existing weddings owned by the user.
        // Every child model has `onDelete: Cascade` on its wedding relation,
        // so this single call wipes events / guests / budget / vendors /
        // payments / seating / outfits / tasks / checklists / mood board /
        // beauty / menu / notes for those weddings.
        // User row, subscription, and notificationPrefs are untouched.
        await tx.wedding.deleteMany({ where: { userId: id } });

        return seedUserData(tx, id);
      },
      { maxWait: 10_000, timeout: 30_000 },
    );

    log.info("Seeded test data", { targetUserId: id, summary });
    return NextResponse.json({ summary });
  } catch (err) {
    const message = (err as Error).message ?? "Unknown error";
    log.error("Failed to seed test data", { error: message });
    return NextResponse.json(
      { error: `Failed to seed test data: ${message}` },
      { status: 500 },
    );
  }
}

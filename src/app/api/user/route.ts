import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidateUserSession } from "@/lib/session-invalidation";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/user");

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to PATCH /api/user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { name } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { name: name.trim() },
    });

    log.info("User profile updated", { userId });

    return NextResponse.json({ message: "Profile updated", name: user.name });
  } catch (err) {
    log.error("Failed to update user profile", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to DELETE /api/user");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    log.info("Deleting user account", { userId });

    await prisma.user.delete({
      where: { id: userId },
    });

    // Instantly invalidate session
    invalidateUserSession(userId);

    log.info("User account deleted", { userId });

    return NextResponse.json({ message: "Account deleted successfully" });
  } catch (err) {
    log.error("Failed to delete user account", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { DEFAULT_PREFS, type NotificationPrefs } from "@/lib/notification-prefs";

const log = createLogger("api/user/notification-prefs");

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { notificationPrefs: true },
    });

    const prefs = user?.notificationPrefs
      ? { ...DEFAULT_PREFS, ...(user.notificationPrefs as Partial<NotificationPrefs>) }
      : { ...DEFAULT_PREFS };

    return NextResponse.json(prefs);
  } catch (err) {
    log.error("Failed to fetch notification prefs", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Only allow known preference keys
    const allowedKeys = Object.keys(DEFAULT_PREFS);
    const updates: Partial<NotificationPrefs> = {};
    for (const key of allowedKeys) {
      if (key in body && typeof body[key] === "boolean") {
        (updates as Record<string, boolean>)[key] = body[key];
      }
    }

    // Merge with existing prefs
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { notificationPrefs: true },
    });

    const currentPrefs = user?.notificationPrefs
      ? { ...DEFAULT_PREFS, ...(user.notificationPrefs as Partial<NotificationPrefs>) }
      : { ...DEFAULT_PREFS };

    const newPrefs = { ...currentPrefs, ...updates };

    await prisma.user.update({
      where: { id: session.user.id },
      data: { notificationPrefs: newPrefs },
    });

    log.info("Notification prefs updated", { userId: session.user.id, changes: Object.keys(updates) });
    return NextResponse.json(newPrefs);
  } catch (err) {
    log.error("Failed to update notification prefs", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to update preferences" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { getUserNotifPrefs } from "@/lib/notification-prefs";
import { createLogger } from "@/lib/logger";
import {
  renderEventReminderItems,
  type EventReminderItem,
} from "@/lib/email/templates/event-reminder";

const log = createLogger("cron/event-reminders");
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://knotbook.co.uk";

function verifyCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const events = await prisma.event.findMany({
      where: {
        date: { gte: now, lte: in7d },
        reminderSentAt: null,
      },
      include: {
        wedding: {
          select: { userId: true },
        },
      },
      orderBy: { date: "asc" },
    });

    const byUser = new Map<string, typeof events>();
    for (const event of events) {
      const userId = event.wedding.userId;
      const arr = byUser.get(userId) || [];
      arr.push(event);
      byUser.set(userId, arr);
    }

    let usersSent = 0;
    let eventsSent = 0;
    let skipped = 0;
    let failed = 0;

    for (const [userId, userEvents] of byUser) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, id: true },
      });
      if (!user) continue;

      const prefs = await getUserNotifPrefs(user.id);
      if (!prefs.emailEvents) {
        skipped += userEvents.length;
        continue;
      }

      const items: EventReminderItem[] = userEvents.map((e) => ({
        eventName: e.name,
        eventDate: e.date.toLocaleDateString("en-GB", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        eventTime: e.startTime || "TBC",
        venue: e.venue || "TBC",
      }));

      const count = items.length;
      const subject =
        count === 1
          ? `Upcoming: ${items[0].eventName} on ${items[0].eventDate}`
          : `${count} upcoming events in your timeline`;

      try {
        await sendEmail({
          to: user.email,
          slug: "event-reminder",
          subject,
          variables: {
            name: user.name,
            count: String(count),
            itemsHtml: renderEventReminderItems(items),
            dashboardUrl: `${APP_URL}/dashboard/timeline`,
          },
          recipientName: user.name,
        });
        await prisma.event.updateMany({
          where: { id: { in: userEvents.map((e) => e.id) } },
          data: { reminderSentAt: new Date() },
        });
        usersSent++;
        eventsSent += count;
      } catch (itemErr) {
        failed += count;
        log.error("Event reminder digest send failed for user", {
          userId: user.id,
          eventCount: count,
          error: (itemErr as Error).message,
        });
      }
    }

    log.info("Event reminders sent", {
      foundEvents: events.length,
      foundUsers: byUser.size,
      usersSent,
      eventsSent,
      skipped,
      failed,
    });
    return NextResponse.json({
      message: `Sent ${usersSent} digest email(s) covering ${eventsSent} event(s)`,
    });
  } catch (err) {
    log.error("Event reminder cron failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}

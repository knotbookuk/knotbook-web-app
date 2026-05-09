import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { getUserNotifPrefs } from "@/lib/notification-prefs";
import { createLogger } from "@/lib/logger";
import {
  renderTaskReminderItems,
  type TaskReminderItem,
} from "@/lib/email/templates/task-reminder";

const log = createLogger("cron/task-reminders");
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
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const tasks = await prisma.task.findMany({
      where: {
        dueDate: { gte: now, lte: in24h },
        status: { not: "COMPLETED" },
        reminderSentAt: null,
      },
      include: {
        wedding: {
          select: { userId: true },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    const byUser = new Map<string, typeof tasks>();
    for (const task of tasks) {
      const userId = task.wedding.userId;
      const arr = byUser.get(userId) || [];
      arr.push(task);
      byUser.set(userId, arr);
    }

    let usersSent = 0;
    let tasksSent = 0;
    let skipped = 0;
    let failed = 0;

    for (const [userId, userTasks] of byUser) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, id: true },
      });
      if (!user) continue;

      const prefs = await getUserNotifPrefs(user.id);
      if (!prefs.emailTasks) {
        skipped += userTasks.length;
        continue;
      }

      const items: TaskReminderItem[] = userTasks.map((t) => ({
        taskName: t.title,
        dueDate: t.dueDate
          ? t.dueDate.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "Soon",
        priority: t.priority,
      }));

      const count = items.length;
      const subject =
        count === 1
          ? `Reminder: ${items[0].taskName} is due ${items[0].dueDate}`
          : `${count} tasks due soon`;

      try {
        await sendEmail({
          to: user.email,
          slug: "task-reminder",
          subject,
          variables: {
            name: user.name,
            count: String(count),
            itemsHtml: renderTaskReminderItems(items),
            dashboardUrl: `${APP_URL}/dashboard/tasks`,
          },
          recipientName: user.name,
        });
        await prisma.task.updateMany({
          where: { id: { in: userTasks.map((t) => t.id) } },
          data: { reminderSentAt: new Date() },
        });
        usersSent++;
        tasksSent += count;
      } catch (itemErr) {
        failed += count;
        log.error("Task reminder digest send failed for user", {
          userId: user.id,
          taskCount: count,
          error: (itemErr as Error).message,
        });
      }
    }

    log.info("Task reminders sent", {
      foundTasks: tasks.length,
      foundUsers: byUser.size,
      usersSent,
      tasksSent,
      skipped,
      failed,
    });
    return NextResponse.json({
      message: `Sent ${usersSent} digest email(s) covering ${tasksSent} task(s)`,
    });
  } catch (err) {
    log.error("Task reminder cron failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}

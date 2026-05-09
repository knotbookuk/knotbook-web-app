import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { getUserNotifPrefs } from "@/lib/notification-prefs";
import { formatCurrency } from "@/lib/format";
import { createLogger } from "@/lib/logger";
import {
  renderVendorReminderItems,
  type VendorReminderItem,
} from "@/lib/email/templates/vendor-reminder";

const log = createLogger("cron/vendor-reminders");
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

    const payments = await prisma.vendorPayment.findMany({
      where: {
        dueDate: { gte: now, lte: in7d },
        status: "PENDING",
        reminderSentAt: null,
      },
      include: {
        vendor: {
          select: {
            name: true,
            weddingId: true,
            wedding: { select: { userId: true } },
          },
        },
      },
      orderBy: { dueDate: "asc" },
    });

    // Group payments by user so each user gets a single digest email
    // instead of one per payment (which Gmail flags as spam).
    const byUser = new Map<
      string,
      typeof payments
    >();
    for (const payment of payments) {
      const userId = payment.vendor.wedding.userId;
      const arr = byUser.get(userId) || [];
      arr.push(payment);
      byUser.set(userId, arr);
    }

    let usersSent = 0;
    let paymentsSent = 0;
    let skipped = 0;
    let failed = 0;

    for (const [userId, userPayments] of byUser) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, name: true, id: true },
      });
      if (!user) continue;

      const prefs = await getUserNotifPrefs(user.id);
      if (!prefs.emailPayment) {
        skipped += userPayments.length;
        continue;
      }

      const items: VendorReminderItem[] = userPayments.map((p) => ({
        vendorName: p.vendor.name,
        amount: formatCurrency(Number(p.amount)),
        dueDate: p.dueDate.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      }));

      const count = items.length;
      const subject =
        count === 1
          ? `Payment Due: ${items[0].vendorName} — ${items[0].amount}`
          : `${count} vendor payments due soon`;

      try {
        await sendEmail({
          to: user.email,
          slug: "vendor-reminder",
          subject,
          variables: {
            name: user.name,
            count: String(count),
            itemsHtml: renderVendorReminderItems(items),
            dashboardUrl: `${APP_URL}/dashboard/vendors`,
          },
          recipientName: user.name,
        });
        await prisma.vendorPayment.updateMany({
          where: { id: { in: userPayments.map((p) => p.id) } },
          data: { reminderSentAt: new Date() },
        });
        usersSent++;
        paymentsSent += count;
      } catch (itemErr) {
        failed += count;
        log.error("Vendor reminder digest send failed for user", {
          userId: user.id,
          paymentCount: count,
          error: (itemErr as Error).message,
        });
      }
    }

    log.info("Vendor reminders sent", {
      foundPayments: payments.length,
      foundUsers: byUser.size,
      usersSent,
      paymentsSent,
      skipped,
      failed,
    });
    return NextResponse.json({
      message: `Sent ${usersSent} digest email(s) covering ${paymentsSent} vendor payment(s)`,
    });
  } catch (err) {
    log.error("Vendor reminder cron failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/admin/emails");

const DEFAULT_TEMPLATES = [
  {
    slug: "welcome",
    name: "Welcome Email",
    description: "Sent when a new user registers",
    subjectLine: "Welcome to KnotBook, {name}!",
    variables: ["name", "loginUrl"],
  },
  {
    slug: "password-reset",
    name: "Password Reset",
    description: "Sent when a user requests a password reset",
    subjectLine: "Reset your KnotBook password",
    variables: ["name", "resetUrl", "expiryTime"],
  },
  {
    slug: "rsvp-confirmation",
    name: "RSVP Confirmation",
    description: "Sent when a guest submits their RSVP",
    subjectLine: "RSVP Confirmed — {coupleName}'s Wedding",
    variables: ["guestName", "coupleName", "weddingDate", "venue", "rsvpStatus"],
  },
  {
    slug: "task-reminder",
    name: "Task Reminder",
    description: "Sent when a task is due within 24 hours",
    subjectLine: "Reminder: {taskName} is due {dueDate}",
    variables: ["name", "taskName", "dueDate", "priority", "dashboardUrl"],
  },
  {
    slug: "event-reminder",
    name: "Event Reminder",
    description: "Sent before upcoming wedding events",
    subjectLine: "Upcoming: {eventName} on {eventDate}",
    variables: ["name", "eventName", "eventDate", "eventTime", "venue", "dashboardUrl"],
  },
  {
    slug: "payment-receipt",
    name: "Payment Receipt",
    description: "Sent after a subscription payment is confirmed",
    subjectLine: "Payment Confirmed — KnotBook {plan}",
    variables: ["name", "plan", "amount", "date", "nextBillingDate"],
  },
  {
    slug: "budget-alert",
    name: "Budget Alert",
    description: "Sent when wedding spending crosses threshold (80%, 90%, 100%)",
    subjectLine: "Budget Alert: {percentUsed}% of your wedding budget used",
    variables: ["name", "totalBudget", "totalSpent", "percentUsed", "dashboardUrl"],
  },
  {
    slug: "vendor-reminder",
    name: "Vendor Payment Reminder",
    description: "Sent when a vendor payment is due within 7 days",
    subjectLine: "Payment Due: {vendorName} — {amount}",
    variables: ["name", "vendorName", "amount", "dueDate", "dashboardUrl"],
  },
];

async function seedTemplates() {
  const existing = await prisma.emailTemplate.count();
  if (existing > 0) return;

  log.info("Seeding email templates");
  for (const t of DEFAULT_TEMPLATES) {
    await prisma.emailTemplate.create({
      data: {
        slug: t.slug,
        name: t.name,
        description: t.description,
        subjectLine: t.subjectLine,
        replyTo: "admin@knotbook.co.uk",
        variables: t.variables,
      },
    });
  }
  log.info("Email templates seeded", { count: DEFAULT_TEMPLATES.length });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Auto-seed templates on first load
    await seedTemplates();

    const templates = await prisma.emailTemplate.findMany({
      orderBy: { slug: "asc" },
      include: {
        _count: { select: { logs: true } },
      },
    });

    // Get total stats
    const totalSent = await prisma.emailLog.count({ where: { status: "SENT" } });
    const totalFailed = await prisma.emailLog.count({ where: { status: "FAILED" } });

    // Get last sent date per template
    const templatesWithStats = await Promise.all(
      templates.map(async (t) => {
        const lastLog = await prisma.emailLog.findFirst({
          where: { templateSlug: t.slug, status: "SENT" },
          orderBy: { sentAt: "desc" },
          select: { sentAt: true },
        });
        return {
          ...t,
          totalSent: t._count.logs,
          lastSentAt: lastLog?.sentAt || null,
        };
      })
    );

    log.info("Fetched email templates", { count: templates.length });

    return NextResponse.json({
      templates: templatesWithStats,
      stats: {
        totalSent,
        totalFailed,
        deliveryRate:
          totalSent + totalFailed > 0
            ? Math.round((totalSent / (totalSent + totalFailed)) * 100)
            : 100,
      },
    });
  } catch (err) {
    log.error("Failed to fetch email templates", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Failed to fetch email templates" },
      { status: 500 }
    );
  }
}

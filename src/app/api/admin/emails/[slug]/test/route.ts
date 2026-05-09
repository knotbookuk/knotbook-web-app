import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";
import type { TemplateSlug } from "@/lib/email/types";
import { createLogger } from "@/lib/logger";
import { renderVendorReminderItems } from "@/lib/email/templates/vendor-reminder";
import { renderTaskReminderItems } from "@/lib/email/templates/task-reminder";
import { renderEventReminderItems } from "@/lib/email/templates/event-reminder";

const log = createLogger("api/admin/emails/test");

const SAMPLE_DATA: Record<string, Record<string, string>> = {
  welcome: {
    name: "Sarah",
    loginUrl: "https://knotbook.co.uk/login",
  },
  "password-reset": {
    name: "Sarah",
    resetUrl: "https://knotbook.co.uk/reset-password/sample-token",
    expiryTime: "1 hour",
  },
  "rsvp-confirmation": {
    guestName: "James Smith",
    coupleName: "Sarah & Ahmed",
    weddingDate: "15 August 2026",
    venue: "The Grand Ballroom, London",
    rsvpStatus: "ATTENDING",
  },
  "task-reminder": {
    name: "Sarah",
    count: "2",
    itemsHtml: renderTaskReminderItems([
      { taskName: "Finalise seating chart", dueDate: "10 April 2026", priority: "HIGH" },
      { taskName: "Confirm florist order", dueDate: "11 April 2026", priority: "MEDIUM" },
    ]),
    dashboardUrl: "https://knotbook.co.uk/dashboard/tasks",
  },
  "event-reminder": {
    name: "Sarah",
    count: "2",
    itemsHtml: renderEventReminderItems([
      { eventName: "Mehndi Night", eventDate: "12 August 2026", eventTime: "6:00 PM", venue: "Rose Garden Marquee" },
      { eventName: "Nikkah Ceremony", eventDate: "14 August 2026", eventTime: "11:00 AM", venue: "The Grand Ballroom" },
    ]),
    dashboardUrl: "https://knotbook.co.uk/dashboard/timeline",
  },
  "payment-receipt": {
    name: "Sarah",
    plan: "Lifetime",
    amount: "£49.99",
    date: "6 April 2026",
    nextBillingDate: "N/A — Lifetime plan",
  },
  "budget-alert": {
    name: "Sarah",
    totalBudget: "£25,000",
    totalSpent: "£22,500",
    percentUsed: "90",
    dashboardUrl: "https://knotbook.co.uk/dashboard/budget",
  },
  "vendor-reminder": {
    name: "Sarah",
    count: "3",
    itemsHtml: renderVendorReminderItems([
      { vendorName: "Elegance Catering", amount: "£3,500", dueDate: "15 April 2026" },
      { vendorName: "DJ Bhangra Beats", amount: "£800", dueDate: "20 April 2026" },
      { vendorName: "Lumen Studios", amount: "£1,500", dueDate: "28 April 2026" },
    ]),
    dashboardUrl: "https://knotbook.co.uk/dashboard/vendors",
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const sampleVars = SAMPLE_DATA[slug];
    if (!sampleVars) {
      return NextResponse.json(
        { error: "Unknown template slug" },
        { status: 400 }
      );
    }

    // Allow the admin to specify a recipient, falling back to their own
    // session email. Empty/missing body is fine — body parse can throw on
    // empty payloads in some runtimes, so swallow any error.
    let body: { to?: string } = {};
    try {
      body = (await req.json()) as { to?: string };
    } catch {
      body = {};
    }
    const requestedTo = body.to?.trim();
    const to = requestedTo || session.user.email;
    if (!to) {
      return NextResponse.json(
        { error: "No recipient email available — provide one in the request body" },
        { status: 400 }
      );
    }
    if (!EMAIL_RE.test(to)) {
      return NextResponse.json(
        { error: `Invalid email address: ${to}` },
        { status: 400 }
      );
    }

    const result = await sendEmail({
      to,
      slug: slug as TemplateSlug,
      variables: sampleVars,
      recipientName: session.user.name || "Admin",
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    log.info("Test email sent", { slug, to });
    return NextResponse.json({
      message: "Test email sent to " + to,
    });
  } catch (err) {
    log.error("Failed to send test email", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    );
  }
}

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/admin/cron");

const ALLOWED_TYPES = ["vendor-reminders", "task-reminders", "event-reminders"] as const;
type CronType = (typeof ALLOWED_TYPES)[number];

/**
 * Admin-only "trigger now" passthrough for the daily reminder cron endpoints.
 *
 * We deliberately re-fetch the public cron endpoint (rather than re-importing
 * its handler) so that manual admin triggers exercise exactly the same code
 * path as the scheduled GitHub Actions run, including the bearer-token
 * verification. This keeps idempotency behaviour consistent regardless of
 * who fired the job.
 *
 * `CRON_SECRET` is read server-side only and never sent to the browser.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      log.warn("Non-admin tried to trigger cron", {
        userId: session.user.id,
        role: session.user.role,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { type } = await params;
    if (!ALLOWED_TYPES.includes(type as CronType)) {
      return NextResponse.json(
        { error: `Invalid cron type. Must be one of: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 },
      );
    }

    const secret = process.env.CRON_SECRET;
    if (!secret) {
      log.error("CRON_SECRET is not set; cannot trigger cron");
      return NextResponse.json(
        { error: "Server is missing CRON_SECRET env var" },
        { status: 500 },
      );
    }

    // Derive a base URL for the loopback fetch. Prefer the public app URL,
    // fall back to the host the admin request came in on.
    const host = req.headers.get("host");
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (host ? `${proto}://${host}` : "https://knotbook.co.uk");

    const target = `${baseUrl}/api/cron/${type}`;
    log.info("Admin manual cron trigger", {
      type,
      target,
      adminId: session.user.id,
    });

    const cronRes = await fetch(target, {
      method: "GET",
      headers: { Authorization: `Bearer ${secret}` },
      cache: "no-store",
    });

    // Pass the cron endpoint's body straight through so the UI can show
    // sent/skipped/failed counts as-is.
    const text = await cronRes.text();
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }

    return NextResponse.json(body, { status: cronRes.status });
  } catch (err) {
    log.error("Admin cron trigger failed", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to trigger cron" },
      { status: 500 },
    );
  }
}

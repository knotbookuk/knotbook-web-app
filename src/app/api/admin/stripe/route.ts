import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripeMode } from "@/lib/stripe";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/admin/stripe");

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/admin/stripe");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      log.warn("Non-admin access attempt to GET /api/admin/stripe", {
        userId: session.user.id,
        role: session.user.role,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    log.debug("Fetching Stripe mode", { userId: session.user.id });

    const mode = await getStripeMode();

    return NextResponse.json({ mode });
  } catch (err) {
    log.error("Failed to fetch Stripe mode", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Failed to fetch Stripe mode" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to PATCH /api/admin/stripe");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      log.warn("Non-admin access attempt to PATCH /api/admin/stripe", {
        userId: session.user.id,
        role: session.user.role,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { mode } = await req.json();

    if (mode !== "test" && mode !== "live") {
      return NextResponse.json(
        { error: "Invalid mode. Must be \"test\" or \"live\"" },
        { status: 400 }
      );
    }

    log.info("Updating Stripe mode", { userId: session.user.id, mode });

    await prisma.adminSetting.upsert({
      where: { key: "stripe_mode" },
      update: { value: mode },
      create: { key: "stripe_mode", value: mode },
    });

    log.info("Stripe mode updated", { mode });

    return NextResponse.json({ mode });
  } catch (err) {
    log.error("Failed to update Stripe mode", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Failed to update Stripe mode" },
      { status: 500 }
    );
  }
}

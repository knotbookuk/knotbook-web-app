import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripeConfig } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/stripe/config");

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      log.warn("Unauthorized access attempt to GET /api/stripe/config");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    log.debug("Fetching Stripe config", { userId: session.user.id });

    const config = await getStripeConfig();

    return NextResponse.json({
      publishableKey: config.publishableKey,
      mode: config.mode,
      prices: config.prices,
    });
  } catch (err) {
    log.error("Failed to fetch Stripe config", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Failed to fetch Stripe config" },
      { status: 500 }
    );
  }
}

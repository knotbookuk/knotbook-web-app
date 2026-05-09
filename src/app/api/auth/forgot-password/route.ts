import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email/send";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/auth/forgot-password");

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://knotbook.co.uk";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Always return success to prevent email enumeration
    if (!user) {
      log.info("Password reset requested for non-existent email", { email: normalizedEmail });
      return NextResponse.json({ message: "If an account exists with that email, we've sent a reset link." });
    }

    // Generate reset token
    const resetToken = randomUUID();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    // Send reset email
    await sendEmail({
      to: user.email,
      slug: "password-reset",
      variables: {
        name: user.name,
        resetUrl: `${APP_URL}/reset-password/${resetToken}`,
        expiryTime: "1 hour",
      },
      recipientName: user.name,
    });

    log.info("Password reset email sent", { userId: user.id });

    return NextResponse.json({ message: "If an account exists with that email, we've sent a reset link." });
  } catch (err) {
    log.error("Forgot password failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

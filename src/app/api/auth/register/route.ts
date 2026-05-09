import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createLogger } from "@/lib/logger";
import { sendEmail } from "@/lib/email/send";

const log = createLogger("api/auth/register");

export async function POST(req: NextRequest) {
  try {
    log.debug("POST /api/auth/register");

    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      log.warn("Registration attempt with existing email", { email: normalizedEmail });
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
      },
    });

    log.info("User registered successfully", { userId: user.id, email: normalizedEmail });

    // Send welcome email (non-blocking)
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://knotbook.co.uk";
    sendEmail({
      to: normalizedEmail,
      slug: "welcome",
      variables: { name: name.trim(), loginUrl: `${APP_URL}/login` },
      recipientName: name.trim(),
    }).catch((err) => log.error("Failed to send welcome email", { error: (err as Error).message }));

    return NextResponse.json(
      { message: "Account created successfully", userId: user.id },
      { status: 201 }
    );
  } catch (err) {
    log.error("Registration failed", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

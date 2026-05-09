import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/admin/emails/[slug]");

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const template = await prisma.emailTemplate.findUnique({ where: { slug } });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (err) {
    log.error("Failed to fetch template", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Failed to fetch template" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { slug } = await params;
    const body = await req.json();
    const { subjectLine, senderName, replyTo, enabled } = body;

    const template = await prisma.emailTemplate.findUnique({ where: { slug } });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const updated = await prisma.emailTemplate.update({
      where: { slug },
      data: {
        ...(subjectLine !== undefined && { subjectLine }),
        ...(senderName !== undefined && { senderName }),
        ...(replyTo !== undefined && { replyTo }),
        ...(enabled !== undefined && { enabled }),
      },
    });

    log.info("Email template updated", { slug, changes: Object.keys(body) });
    return NextResponse.json(updated);
  } catch (err) {
    log.error("Failed to update template", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Failed to update template" },
      { status: 500 }
    );
  }
}

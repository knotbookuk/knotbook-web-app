import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidateUserSession } from "@/lib/session-invalidation";
import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/admin/users/[id]");

/* ─── GET: Fetch single user with ALL related data ─── */

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    log.debug("GET /api/admin/users/[id]", { targetUserId: id });

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        subscription: {
          include: {
            billingHistory: {
              orderBy: { paidAt: "desc" },
            },
          },
        },
        weddings: {
          include: {
            guests: {
              orderBy: { createdAt: "desc" },
            },
            budgetItems: {
              orderBy: { sortOrder: "asc" },
            },
            events: {
              orderBy: { date: "asc" },
            },
            tasks: {
              orderBy: { sortOrder: "asc" },
            },
            checklistItems: {
              orderBy: { sortOrder: "asc" },
            },
            vendors: {
              include: {
                payments: {
                  orderBy: { dueDate: "asc" },
                },
              },
              orderBy: { createdAt: "desc" },
            },
            seatingTables: {
              include: {
                guests: true,
              },
              orderBy: { createdAt: "asc" },
            },
            outfits: {
              orderBy: { createdAt: "desc" },
            },
            moodBoardItems: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
        notifications: {
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    log.info("Fetched user detail", { targetUserId: id });
    return NextResponse.json(user);
  } catch (err) {
    log.error("Failed to fetch user detail", {
      error: (err as Error).message,
    });
    return NextResponse.json(
      { error: "Failed to fetch user detail" },
      { status: 500 }
    );
  }
}

/* ─── PATCH: Update user fields ─── */

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    log.debug("PATCH /api/admin/users/[id]", { targetUserId: id, body });

    // Only allow specific fields to be updated
    const allowedFields: Record<string, unknown> = {};
    if (body.name !== undefined) allowedFields.name = body.name;
    if (body.email !== undefined) allowedFields.email = body.email;
    if (body.role !== undefined) {
      if (!["USER", "ADMIN"].includes(body.role)) {
        return NextResponse.json(
          { error: "Invalid role. Must be USER or ADMIN." },
          { status: 400 }
        );
      }
      if (id === session.user.id && body.role !== "ADMIN") {
        return NextResponse.json(
          { error: "You cannot revoke your own admin role" },
          { status: 400 }
        );
      }
      allowedFields.role = body.role;
    }

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: allowedFields,
      include: {
        subscription: true,
        weddings: true,
      },
    });

    log.info("Updated user", { targetUserId: id, fields: Object.keys(allowedFields) });
    return NextResponse.json(updatedUser);
  } catch (err) {
    log.error("Failed to update user", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

/* ─── DELETE: Remove user and all related data ─── */

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    log.debug("DELETE /api/admin/users/[id]", { targetUserId: id });

    // Prevent admins from deleting themselves
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Check user exists
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Delete user — Prisma cascade will handle all related data
    await prisma.user.delete({ where: { id } });

    // Instantly invalidate the deleted user's session
    invalidateUserSession(id);

    log.info("Deleted user", { targetUserId: id, email: user.email });
    return NextResponse.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    log.error("Failed to delete user", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}

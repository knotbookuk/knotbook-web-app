import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/user/type");

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userType } = await req.json();

    if (!["COUPLE", "PLANNER"].includes(userType)) {
      return NextResponse.json({ error: "Invalid userType" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: { userType },
    });

    log.info("User type updated", { userId: session.user.id, userType });

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("Failed to update user type", { error: (err as Error).message });
    return NextResponse.json({ error: "Failed to update user type" }, { status: 500 });
  }
}

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/send";
import { getUserNotifPrefs } from "@/lib/notification-prefs";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/rsvp");

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    const guest = await prisma.guest.findUnique({
      where: { rsvpToken: token },
      include: {
        wedding: {
          select: {
            partnerName1: true,
            partnerName2: true,
            weddingDate: true,
            venue: true,
            culturalStyle: true,
          },
        },
      },
    });

    if (!guest) {
      return NextResponse.json({ error: "Invalid RSVP link" }, { status: 404 });
    }

    return NextResponse.json({
      guestName: guest.name,
      rsvpStatus: guest.rsvpStatus,
      dietaryType: guest.dietaryType,
      allergies: guest.allergies,
      mealPreference: guest.mealPreference,
      plusOne: guest.plusOne,
      plusOneName: guest.plusOneName,
      notes: guest.notes,
      wedding: {
        coupleName: `${guest.wedding.partnerName1} & ${guest.wedding.partnerName2}`,
        weddingDate: guest.wedding.weddingDate,
        venue: guest.wedding.venue,
        culturalStyle: guest.wedding.culturalStyle,
      },
    });
  } catch (err) {
    log.error("Failed to fetch RSVP data", { error: (err as Error).message });
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { rsvpStatus, dietaryType, allergies, mealPreference, plusOneName, notes } = body;

    const guest = await prisma.guest.findUnique({
      where: { rsvpToken: token },
      include: {
        wedding: {
          select: {
            userId: true,
            partnerName1: true,
            partnerName2: true,
            weddingDate: true,
            venue: true,
          },
        },
      },
    });

    if (!guest) {
      return NextResponse.json({ error: "Invalid RSVP link" }, { status: 404 });
    }

    const updated = await prisma.guest.update({
      where: { rsvpToken: token },
      data: {
        rsvpStatus: rsvpStatus || guest.rsvpStatus,
        dietaryType: dietaryType ?? guest.dietaryType,
        allergies: allergies ?? guest.allergies,
        mealPreference: mealPreference ?? guest.mealPreference,
        plusOneName: plusOneName ?? guest.plusOneName,
        notes: notes ?? guest.notes,
      },
    });

    // Send confirmation email if guest has an email and wedding owner has RSVP emails enabled
    const ownerPrefs = await getUserNotifPrefs(guest.wedding.userId);
    if (guest.email && ownerPrefs.emailRsvp) {
      const coupleName = `${guest.wedding.partnerName1} & ${guest.wedding.partnerName2}`;
      const weddingDate = guest.wedding.weddingDate
        ? new Date(guest.wedding.weddingDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
        : "Date TBC";

      await sendEmail({
        to: guest.email,
        slug: "rsvp-confirmation",
        variables: {
          guestName: guest.name,
          coupleName,
          weddingDate,
          venue: guest.wedding.venue || "Venue TBC",
          rsvpStatus: rsvpStatus || guest.rsvpStatus,
        },
        recipientName: guest.name,
      });
    }

    log.info("RSVP submitted", { guestId: guest.id, rsvpStatus: updated.rsvpStatus });

    return NextResponse.json({ message: "RSVP submitted successfully", rsvpStatus: updated.rsvpStatus });
  } catch (err) {
    log.error("RSVP submission failed", { error: (err as Error).message });
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

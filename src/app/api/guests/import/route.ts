import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { createLogger } from "@/lib/logger";
import { randomUUID } from "crypto";

const log = createLogger("api/guests/import");

const VALID_FAMILY_SIDES = ["BRIDE", "GROOM", "MUTUAL"] as const;
const VALID_RSVP = ["ATTENDING", "NOT_COMING", "NO_RESPONSE"] as const;
const MAX_ROWS = 1000;

type FamilySide = (typeof VALID_FAMILY_SIDES)[number];
type RsvpStatus = (typeof VALID_RSVP)[number];

interface ParsedRow {
  rowNumber: number;
  data: {
    name: string;
    email: string | null;
    phone: string | null;
    familySide: FamilySide;
    rsvpStatus: RsvpStatus;
    mealPreference: string | null;
    dietaryType: string | null;
    allergies: string | null;
    plusOnes: number;
    notes: string | null;
  };
  error?: string;
}

/** RFC-4180-ish CSV parser. Handles quoted fields, escaped quotes, embedded commas/newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cell += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(cell);
      cell = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      i++;
      continue;
    }
    cell += c;
    i++;
  }
  // flush last cell/row if file does not end with newline
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function normaliseFamilySide(raw: string): FamilySide {
  const u = raw.trim().toUpperCase();
  if (u === "BRIDE" || u === "B") return "BRIDE";
  if (u === "GROOM" || u === "G") return "GROOM";
  return "MUTUAL";
}

function normaliseRsvp(raw: string): RsvpStatus {
  const u = raw.trim().toUpperCase().replace(/[\s-]/g, "_");
  if (u === "ATTENDING" || u === "YES" || u === "Y") return "ATTENDING";
  if (
    u === "NOT_COMING" ||
    u === "NOT_ATTENDING" ||
    u === "DECLINED" ||
    u === "NO" ||
    u === "N"
  )
    return "NOT_COMING";
  return "NO_RESPONSE";
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const weddingId = session.user.weddingId;
    if (!weddingId) {
      return NextResponse.json({ error: "No wedding found" }, { status: 404 });
    }

    const body = await req.json();
    const csv: string = body.csv;
    if (!csv || typeof csv !== "string") {
      return NextResponse.json({ error: "csv string required" }, { status: 400 });
    }

    const rows = parseCsv(csv).filter((r) => r.some((c) => c.trim().length > 0));
    if (rows.length === 0) {
      return NextResponse.json({ error: "CSV is empty" }, { status: 400 });
    }

    // Header row: lowercase + remove non-alphanum for fuzzy matching
    const header = rows[0].map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
    const dataRows = rows.slice(1);

    if (dataRows.length === 0) {
      return NextResponse.json({ error: "CSV has only a header row" }, { status: 400 });
    }
    if (dataRows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `CSV has ${dataRows.length} rows; max ${MAX_ROWS} per import` },
        { status: 400 }
      );
    }

    // Map header columns by name → index
    const headerMap: Record<string, number> = {};
    const aliases: Record<string, string[]> = {
      name: ["name", "guestname", "fullname"],
      email: ["email", "emailaddress"],
      phone: ["phone", "phonenumber", "mobile", "tel"],
      familyside: ["familyside", "side", "family"],
      rsvpstatus: ["rsvpstatus", "rsvp", "status"],
      mealpreference: ["mealpreference", "meal"],
      dietarytype: ["dietarytype", "dietary", "diet"],
      allergies: ["allergies", "allergy"],
      plusones: ["plusones", "additionalmembers", "additionalguests", "guests"],
      notes: ["notes", "note", "comments"],
    };

    for (const [key, options] of Object.entries(aliases)) {
      const found = header.findIndex((h) => options.includes(h));
      if (found >= 0) headerMap[key] = found;
    }

    if (headerMap.name === undefined) {
      return NextResponse.json(
        { error: "CSV must have a 'Name' column" },
        { status: 400 }
      );
    }

    const parsed: ParsedRow[] = [];
    dataRows.forEach((cells, idx) => {
      const rowNumber = idx + 2; // +1 for header, +1 for 1-indexed
      const get = (key: string) =>
        headerMap[key] !== undefined ? (cells[headerMap[key]] ?? "").trim() : "";

      const name = get("name");
      if (!name) {
        parsed.push({
          rowNumber,
          data: null as unknown as ParsedRow["data"],
          error: "Missing name",
        });
        return;
      }

      const plusOnesRaw = get("plusones");
      const plusOnes = Math.max(0, Math.min(20, parseInt(plusOnesRaw, 10) || 0));

      parsed.push({
        rowNumber,
        data: {
          name,
          email: get("email") || null,
          phone: get("phone") || null,
          familySide: normaliseFamilySide(get("familyside")),
          rsvpStatus: normaliseRsvp(get("rsvpstatus")),
          mealPreference: get("mealpreference") || null,
          dietaryType: get("dietarytype") || null,
          allergies: get("allergies") || null,
          plusOnes,
          notes: get("notes") || null,
        },
      });
    });

    const valid = parsed.filter((p) => !p.error);
    const invalid = parsed.filter((p) => p.error);

    if (valid.length === 0) {
      return NextResponse.json(
        {
          error: "No valid rows found",
          imported: 0,
          skipped: invalid.length,
          errors: invalid.map((p) => ({ row: p.rowNumber, error: p.error })),
        },
        { status: 400 }
      );
    }

    const result = await prisma.guest.createMany({
      data: valid.map((p) => ({
        weddingId,
        name: p.data.name,
        email: p.data.email,
        phone: p.data.phone,
        familySide: p.data.familySide,
        rsvpStatus: p.data.rsvpStatus,
        mealPreference: p.data.mealPreference,
        dietaryType: p.data.dietaryType,
        allergies: p.data.allergies,
        plusOnes: p.data.plusOnes,
        notes: p.data.notes,
        rsvpToken: randomUUID(),
      })),
    });

    log.info("Guests imported", {
      weddingId,
      imported: result.count,
      skipped: invalid.length,
    });

    return NextResponse.json({
      imported: result.count,
      skipped: invalid.length,
      errors: invalid.map((p) => ({ row: p.rowNumber, error: p.error })),
    });
  } catch (err) {
    log.error("Failed to import guests", { error: (err as Error).message });
    return NextResponse.json(
      { error: "Failed to import guests: " + (err as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Admin test-data seeder.
 *
 * Used by `POST /api/admin/users/[id]/seed` to wipe a user's existing wedding
 * (cascade) and replace it with rich, realistic dummy data designed to exercise
 * every email reminder + cron flow.
 *
 * IMPORTANT: every reminder-relevant date is computed relative to `new Date()`
 * inside the helpers below — DO NOT hardcode any `new Date("...")` values, or
 * the cron jobs will not fire on the test data.
 */

import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";

// ───── Time helpers (relative to call time) ──────────────────────────────────

function hoursFromNow(h: number): Date {
  return new Date(Date.now() + h * 60 * 60 * 1000);
}

function daysFromNow(d: number): Date {
  return new Date(Date.now() + d * 24 * 60 * 60 * 1000);
}

/** Set the time-of-day on a Date without mutating the original. */
function atTime(date: Date, hours: number, minutes = 0): Date {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// ───── Public API ────────────────────────────────────────────────────────────

export interface SeedSummary {
  weddings: number;
  events: number;
  guests: number;
  budgetItems: number;
  vendors: number;
  payments: number;
  outfits: number;
  tasks: number;
  checklists: number;
  seatingTables: number;
  moodBoardItems: number;
  beautyProfessionals: number;
  beautyTrials: number;
  beautyInspirations: number;
  menuItems: number;
  menuBeverages: number;
  notes: number;
}

/**
 * Seed a fresh wedding + all child rows for `userId`. Caller MUST supply a
 * Prisma transaction client so any failure rolls everything back atomically.
 *
 * Caller is responsible for deleting the user's existing weddings first
 * (cascades wipe child rows automatically — every child model has
 * `onDelete: Cascade` on its wedding relation).
 */
export async function seedUserData(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<SeedSummary> {
  // ─── Wedding ────────────────────────────────────────────────────────────
  const weddingDate = daysFromNow(180); // ~6 months from now
  const wedding = await tx.wedding.create({
    data: {
      userId,
      partnerName1: "Aarav Patel",
      partnerName2: "Aanya Sharma",
      weddingDate,
      culturalStyle: "CLASSIC_ASIAN",
      totalBudget: 45000,
      venue: "The Grand Pavilion, London",
      notes: "Test data — three-day Asian wedding.",
    },
  });
  const weddingId = wedding.id;

  // ─── Events ─────────────────────────────────────────────────────────────
  // Mehndi / Sangeet / Wedding / Reception are anchored to weddingDate.
  // The ENGAGEMENT PARTY is 5 days from now → guaranteed to fall inside the
  // 7-day event-reminder window so the cron actually fires on the seed.
  const events = [
    {
      name: "Engagement Party",
      description: "Casual engagement celebration with close family.",
      date: atTime(daysFromNow(5), 18, 0), // ⇐ FIRES event-reminder cron
      startTime: "18:00",
      endTime: "22:00",
      venue: "The Hampstead Room, London",
      dayLabel: "Pre-event",
      sortOrder: 0,
    },
    {
      name: "Mehndi Night",
      description: "Traditional henna ceremony with family and friends.",
      date: atTime(daysFromNow(180 - 2), 18, 0),
      startTime: "18:00",
      endTime: "23:00",
      venue: "The Grand Pavilion (Garden Room)",
      dayLabel: "Day 1",
      sortOrder: 1,
    },
    {
      name: "Sangeet",
      description: "Music and dance evening before the wedding.",
      date: atTime(daysFromNow(180 - 1), 19, 0),
      startTime: "19:00",
      endTime: "00:00",
      venue: "The Grand Pavilion (Ballroom)",
      dayLabel: "Day 2",
      sortOrder: 2,
    },
    {
      name: "Wedding Ceremony",
      description: "Pheras and main wedding ceremony.",
      date: atTime(weddingDate, 10, 0),
      startTime: "10:00",
      endTime: "14:00",
      venue: "The Grand Pavilion (Mandap Lawn)",
      dayLabel: "Day 3",
      sortOrder: 3,
    },
    {
      name: "Reception",
      description: "Grand evening reception and dinner.",
      date: atTime(weddingDate, 19, 0),
      startTime: "19:00",
      endTime: "00:00",
      venue: "The Grand Pavilion (Great Hall)",
      dayLabel: "Day 3",
      sortOrder: 4,
    },
  ];

  await tx.event.createMany({
    data: events.map((e) => ({ weddingId, ...e })),
  });

  // ─── Seating Tables ─────────────────────────────────────────────────────
  const brideTable = await tx.seatingTable.create({
    data: {
      weddingId,
      name: "Bride's Family",
      capacity: 8,
      shape: "ROUND",
    },
  });
  const groomTable = await tx.seatingTable.create({
    data: {
      weddingId,
      name: "Groom's Family",
      capacity: 8,
      shape: "ROUND",
    },
  });
  const friendsTable = await tx.seatingTable.create({
    data: {
      weddingId,
      name: "Friends",
      capacity: 6,
      shape: "SQUARE",
    },
  });
  const seatingTables = 3;

  // ─── Guests ─────────────────────────────────────────────────────────────
  type GuestSeed = {
    name: string;
    email: string | null;
    phone: string | null;
    familySide: "BRIDE" | "GROOM" | "MUTUAL";
    rsvpStatus: "ATTENDING" | "NOT_COMING" | "NO_RESPONSE";
    mealPreference: string | null;
    dietaryType: string | null;
    allergies: string | null;
    plusOne: boolean;
    plusOneName: string | null;
    tableId: string | null;
  };

  // RSVP enum only has ATTENDING / NOT_COMING / NO_RESPONSE.
  // Spec asked for PENDING + DECLINED + NO_RESPONSE — mapped:
  //   PENDING  → NO_RESPONSE (4 of them, distinct from the 2 baseline NO_RESPONSE)
  //   DECLINED → NOT_COMING  (4 of them)
  const guestSeeds: GuestSeed[] = [
    // 14 ATTENDING ─ diverse meals + allergies
    { name: "Rohan Patel", email: "rohan.patel@example.com", phone: "+44 7700 900101", familySide: "GROOM", rsvpStatus: "ATTENDING", mealPreference: "VEG", dietaryType: "Vegetarian", allergies: null, plusOne: true, plusOneName: "Priya Patel", tableId: groomTable.id },
    { name: "Meera Sharma", email: "meera.sharma@example.com", phone: "+44 7700 900102", familySide: "BRIDE", rsvpStatus: "ATTENDING", mealPreference: "VEGAN", dietaryType: "Vegan", allergies: null, plusOne: false, plusOneName: null, tableId: brideTable.id },
    { name: "Arjun Singh", email: "arjun.singh@example.com", phone: "+44 7700 900103", familySide: "MUTUAL", rsvpStatus: "ATTENDING", mealPreference: "NON_VEG", dietaryType: null, allergies: "NUT_ALLERGY", plusOne: true, plusOneName: "Sara Singh", tableId: friendsTable.id },
    { name: "Fatima Khan", email: null, phone: "+44 7700 900104", familySide: "BRIDE", rsvpStatus: "ATTENDING", mealPreference: "HALAL", dietaryType: "Halal", allergies: null, plusOne: false, plusOneName: null, tableId: brideTable.id },
    { name: "David Cohen", email: "david.cohen@example.com", phone: null, familySide: "GROOM", rsvpStatus: "ATTENDING", mealPreference: "KOSHER", dietaryType: "Kosher", allergies: null, plusOne: false, plusOneName: null, tableId: groomTable.id },
    { name: "Lucy Green", email: null, phone: null, familySide: "MUTUAL", rsvpStatus: "ATTENDING", mealPreference: "VEG", dietaryType: null, allergies: "NUT_ALLERGY, dairy", plusOne: true, plusOneName: "Tom Green", tableId: friendsTable.id },
    { name: "Sanjay Gupta", email: "sanjay.gupta@example.com", phone: "+44 7700 900107", familySide: "GROOM", rsvpStatus: "ATTENDING", mealPreference: "NON_VEG", dietaryType: null, allergies: null, plusOne: false, plusOneName: null, tableId: groomTable.id },
    { name: "Nisha Mehta", email: null, phone: "+44 7700 900108", familySide: "BRIDE", rsvpStatus: "ATTENDING", mealPreference: "VEG", dietaryType: "Vegetarian", allergies: null, plusOne: true, plusOneName: "Kiran Mehta", tableId: brideTable.id },
    { name: "Aisha Ahmed", email: "aisha.ahmed@example.com", phone: null, familySide: "BRIDE", rsvpStatus: "ATTENDING", mealPreference: "HALAL", dietaryType: null, allergies: null, plusOne: false, plusOneName: null, tableId: brideTable.id },
    { name: "James O'Connor", email: null, phone: null, familySide: "MUTUAL", rsvpStatus: "ATTENDING", mealPreference: "NON_VEG", dietaryType: null, allergies: null, plusOne: true, plusOneName: "Hannah O'Connor", tableId: friendsTable.id },
    { name: "Priyanka Iyer", email: "priyanka.iyer@example.com", phone: "+44 7700 900111", familySide: "BRIDE", rsvpStatus: "ATTENDING", mealPreference: "VEGAN", dietaryType: null, allergies: null, plusOne: false, plusOneName: null, tableId: brideTable.id },
    { name: "Karan Joshi", email: null, phone: "+44 7700 900112", familySide: "GROOM", rsvpStatus: "ATTENDING", mealPreference: "NON_VEG", dietaryType: null, allergies: null, plusOne: false, plusOneName: null, tableId: groomTable.id },
    { name: "Sophie Bennett", email: "sophie.bennett@example.com", phone: null, familySide: "MUTUAL", rsvpStatus: "ATTENDING", mealPreference: "VEG", dietaryType: null, allergies: null, plusOne: true, plusOneName: "Mark Bennett", tableId: friendsTable.id },
    { name: "Ishaan Verma", email: null, phone: null, familySide: "GROOM", rsvpStatus: "ATTENDING", mealPreference: "NON_VEG", dietaryType: null, allergies: null, plusOne: false, plusOneName: null, tableId: groomTable.id },

    // 4 PENDING (modelled as NO_RESPONSE — see note above)
    { name: "Vikram Rao", email: "vikram.rao@example.com", phone: "+44 7700 900201", familySide: "GROOM", rsvpStatus: "NO_RESPONSE", mealPreference: null, dietaryType: null, allergies: null, plusOne: false, plusOneName: null, tableId: null },
    { name: "Anita Desai", email: null, phone: "+44 7700 900202", familySide: "BRIDE", rsvpStatus: "NO_RESPONSE", mealPreference: null, dietaryType: null, allergies: null, plusOne: false, plusOneName: null, tableId: null },
    { name: "Charles Wright", email: "charles.wright@example.com", phone: null, familySide: "MUTUAL", rsvpStatus: "NO_RESPONSE", mealPreference: null, dietaryType: null, allergies: null, plusOne: false, plusOneName: null, tableId: null },
    { name: "Elena Rossi", email: null, phone: null, familySide: "MUTUAL", rsvpStatus: "NO_RESPONSE", mealPreference: null, dietaryType: null, allergies: null, plusOne: false, plusOneName: null, tableId: null },

    // 4 DECLINED → NOT_COMING
    { name: "Tariq Hussain", email: "tariq.hussain@example.com", phone: "+44 7700 900301", familySide: "GROOM", rsvpStatus: "NOT_COMING", mealPreference: null, dietaryType: null, allergies: null, plusOne: false, plusOneName: null, tableId: null },
    { name: "Olivia Brown", email: null, phone: "+44 7700 900302", familySide: "BRIDE", rsvpStatus: "NOT_COMING", mealPreference: null, dietaryType: null, allergies: null, plusOne: false, plusOneName: null, tableId: null },
    { name: "Daniel Park", email: "daniel.park@example.com", phone: null, familySide: "MUTUAL", rsvpStatus: "NOT_COMING", mealPreference: null, dietaryType: null, allergies: null, plusOne: false, plusOneName: null, tableId: null },
    { name: "Reema Bhatt", email: null, phone: null, familySide: "BRIDE", rsvpStatus: "NOT_COMING", mealPreference: null, dietaryType: null, allergies: null, plusOne: false, plusOneName: null, tableId: null },

    // 2 baseline NO_RESPONSE
    { name: "Plus One Slot A", email: null, phone: null, familySide: "MUTUAL", rsvpStatus: "NO_RESPONSE", mealPreference: null, dietaryType: null, allergies: null, plusOne: false, plusOneName: null, tableId: null },
    { name: "Plus One Slot B", email: null, phone: null, familySide: "MUTUAL", rsvpStatus: "NO_RESPONSE", mealPreference: null, dietaryType: null, allergies: null, plusOne: false, plusOneName: null, tableId: null },
  ];

  await tx.guest.createMany({
    data: guestSeeds.map((g) => ({
      weddingId,
      name: g.name,
      email: g.email,
      phone: g.phone,
      familySide: g.familySide,
      rsvpStatus: g.rsvpStatus,
      mealPreference: g.mealPreference,
      dietaryType: g.dietaryType,
      allergies: g.allergies,
      plusOne: g.plusOne,
      plusOneName: g.plusOneName,
      tableId: g.tableId,
      rsvpToken: randomUUID(),
    })),
  });

  // ─── Budget Items ───────────────────────────────────────────────────────
  // Total estimated < totalBudget (45000) so alert thresholds aren't pre-tripped.
  const budgetItems = [
    { category: "Venue",        description: "Grand Pavilion (3-day hire)", estimatedCost: 9000, actualCost: 9000, paidAmount: 4500, dueDate: daysFromNow(40), status: "PARTIALLY_PAID" as const, sortOrder: 0 },
    { category: "Catering",     description: "Wedding + Reception buffet", estimatedCost: 6500, actualCost: 6800, paidAmount: 1500, dueDate: daysFromNow(60), status: "DUE" as const, sortOrder: 1 },
    { category: "Photography",  description: "Two-photographer package",   estimatedCost: 2500, actualCost: 2500, paidAmount: 1000, dueDate: daysFromNow(15), status: "PARTIALLY_PAID" as const, sortOrder: 2 },
    { category: "Outfits",      description: "Bride lehenga",              estimatedCost: 3500, actualCost: 3500, paidAmount: 3500, dueDate: daysFromNow(-10), status: "PAID" as const, sortOrder: 3 },
    { category: "Outfits",      description: "Groom sherwani",             estimatedCost: 1500, actualCost: 1500, paidAmount: 750, dueDate: daysFromNow(20), status: "PARTIALLY_PAID" as const, sortOrder: 4 },
    { category: "Decor",        description: "Mandap + flower arches",     estimatedCost: 2800, actualCost: 0, paidAmount: 0, dueDate: daysFromNow(45), status: "DUE" as const, sortOrder: 5 },
    { category: "Mehndi",       description: "Mehndi artist + supplies",   estimatedCost: 600,  actualCost: 600, paidAmount: 600, dueDate: daysFromNow(-30), status: "PAID" as const, sortOrder: 6 },
    { category: "Music",        description: "DJ + sound system",          estimatedCost: 1200, actualCost: 1200, paidAmount: 0, dueDate: daysFromNow(-2), status: "OVERDUE" as const, sortOrder: 7 },
    { category: "Stationery",   description: "Invitations + RSVP cards",   estimatedCost: 450,  actualCost: 480, paidAmount: 480, dueDate: daysFromNow(-60), status: "PAID" as const, sortOrder: 8 },
    { category: "Hair & Makeup", description: "Bridal trial + day-of",     estimatedCost: 800,  actualCost: 0, paidAmount: 0, dueDate: daysFromNow(90), status: "DUE" as const, sortOrder: 9 },
    { category: "Transport",    description: "Vintage car + guest coach",  estimatedCost: 700,  actualCost: 0, paidAmount: 0, dueDate: daysFromNow(120), status: "DUE" as const, sortOrder: 10 },
    { category: "Cake",         description: "Three-tier wedding cake",    estimatedCost: 350,  actualCost: 0, paidAmount: 0, dueDate: daysFromNow(80), status: "DUE" as const, sortOrder: 11 },
    { category: "Favours",      description: "Guest favour boxes",         estimatedCost: 400,  actualCost: 0, paidAmount: 0, dueDate: daysFromNow(70), status: "DUE" as const, sortOrder: 12 },
    { category: "Honeymoon",    description: "Initial deposit (Maldives)", estimatedCost: 1500, actualCost: 1500, paidAmount: 500, dueDate: daysFromNow(150), status: "PARTIALLY_PAID" as const, sortOrder: 13 },
  ];
  await tx.budgetItem.createMany({
    data: budgetItems.map((b) => ({ weddingId, ...b })),
  });

  // ─── Vendors ────────────────────────────────────────────────────────────
  const florist = await tx.vendor.create({
    data: { weddingId, name: "Bloom & Vine", category: "Florist", contactName: "Hannah Reid", email: "hannah@bloomvine.co.uk", phone: "+44 20 7946 0010", quoteAmount: 1800, status: "POTENTIAL" },
  });
  const caterer = await tx.vendor.create({
    data: { weddingId, name: "Spice Route Catering", category: "Caterer", contactName: "Anil Kapoor", email: "events@spiceroute.co.uk", phone: "+44 20 7946 0020", quoteAmount: 6800, depositAmount: 1500, rating: 5, status: "CONFIRMED" },
  });
  const photographer = await tx.vendor.create({
    data: { weddingId, name: "Lumen Studios", category: "Photography", contactName: "Sara Lin", email: "sara@lumenstudios.com", phone: "+44 20 7946 0030", quoteAmount: 2500, depositAmount: 1000, rating: 5, status: "DEPOSIT_PAID" },
  });
  await tx.vendor.create({
    data: { weddingId, name: "Henna by Zara", category: "Mehndi Artist", contactName: "Zara Malik", email: "zara@hennabyzara.com", phone: "+44 7700 900020", quoteAmount: 600, status: "CONTACTED" },
  });
  const dj = await tx.vendor.create({
    data: { weddingId, name: "DJ Bhangra Beats", category: "DJ", contactName: "Raj Kumar", email: "raj@bhangrabeats.co.uk", phone: "+44 7700 900040", quoteAmount: 1200, depositAmount: 300, rating: 4, status: "CONFIRMED" },
  });
  const decorator = await tx.vendor.create({
    data: { weddingId, name: "Mandap Magic", category: "Decorator", contactName: "Pooja Shah", email: "pooja@mandapmagic.co.uk", phone: "+44 20 7946 0050", quoteAmount: 2800, status: "QUOTE_RECEIVED" },
  });

  // ─── Vendor Payments ────────────────────────────────────────────────────
  // Three of these are within 0-7 days from now and PENDING with reminderSentAt=null.
  // The vendor-reminder cron (window: now → +7d, status PENDING, reminderSentAt null)
  // will pick them up on its next run.
  const payments = [
    { vendorId: photographer.id, amount: 1500, description: "Balance",            dueDate: daysFromNow(3),  status: "PENDING" as const }, // FIRES
    { vendorId: caterer.id,      amount: 2500, description: "Second instalment", dueDate: daysFromNow(6),  status: "PENDING" as const }, // FIRES
    { vendorId: dj.id,           amount: 300,  description: "Deposit",            dueDate: daysFromNow(2),  status: "PENDING" as const }, // FIRES
    { vendorId: decorator.id,    amount: 1400, description: "Deposit",            dueDate: daysFromNow(30), status: "PENDING" as const }, // outside window
    { vendorId: florist.id,      amount: 500,  description: "Deposit",            dueDate: daysFromNow(14), status: "PENDING" as const }, // outside window
  ];
  await tx.vendorPayment.createMany({
    data: payments.map((p) => ({ ...p, reminderSentAt: null })),
  });

  // ─── Outfits ────────────────────────────────────────────────────────────
  const outfits: Array<{
    name: string;
    type: "OUTFIT" | "JEWELLERY" | "ACCESSORY";
    cost: number | null;
    status: "NOT_ORDERED" | "NOT_PAID" | "ORDERED" | "RECEIVED" | "ALTERED" | "READY";
    link: string | null;
  }> = [
    { name: "Bridal Lehenga",          type: "OUTFIT",    cost: 3500, status: "NOT_ORDERED", link: "https://www.bharatslondon.com/collections/bridal-lehenga" },
    { name: "Groom Sherwani",          type: "OUTFIT",    cost: 1500, status: "ORDERED",     link: null },
    { name: "Mother of Bride Saree",   type: "OUTFIT",    cost: 800,  status: "NOT_PAID",    link: null },
    { name: "Bridesmaid Lehenga (Anya)", type: "OUTFIT",  cost: 600,  status: "RECEIVED",    link: null },
    { name: "Wedding Bands",           type: "JEWELLERY", cost: 1200, status: "READY",       link: null },
    { name: "Reception Dress",         type: "OUTFIT",    cost: 900,  status: "ALTERED",     link: null },
    { name: "Hair Accessory (Maang Tikka)", type: "JEWELLERY", cost: null, status: "NOT_ORDERED", link: "https://www.indianjewelleryco.com/maang-tikka" },
    { name: "Bride Shoes",             type: "ACCESSORY", cost: 250,  status: "RECEIVED",    link: null },
  ];
  await tx.outfitItem.createMany({
    data: outfits.map((o) => ({ weddingId, ...o })),
  });

  // ─── Tasks ──────────────────────────────────────────────────────────────
  // First three tasks fall inside the task-reminder cron window
  // (now → now + 24h, status != COMPLETED, reminderSentAt = null) so they fire.
  const tasks = [
    { title: "Confirm final guest count with caterer",  description: "Email Anil with attending count.",        assigneeName: "Aanya",    dueDate: hoursFromNow(12), priority: "HIGH" as const,   status: "TODO" as const,        category: "Catering",     sortOrder: 0 }, // FIRES
    { title: "Pay photographer balance",                 description: "Bank transfer £1,500 to Lumen Studios.", assigneeName: "Aarav",    dueDate: hoursFromNow(20), priority: "MEDIUM" as const, status: "IN_PROGRESS" as const, category: "Vendors",      sortOrder: 1 }, // FIRES
    { title: "Approve mandap floral mock-up",            description: "Reply to Pooja's email with feedback.",  assigneeName: "Aanya",    dueDate: hoursFromNow(22), priority: "LOW" as const,    status: "TODO" as const,        category: "Decor",        sortOrder: 2 }, // FIRES
    { title: "Book mehndi artist trial",                 description: "Lock a Saturday slot with Zara.",        assigneeName: "Aanya",    dueDate: daysFromNow(3),   priority: "MEDIUM" as const, status: "TODO" as const,        category: "Beauty",       sortOrder: 3 },
    { title: "Send save-the-dates",                      description: "Print + post to all 60 households.",     assigneeName: "Aarav",    dueDate: daysFromNow(7),   priority: "HIGH" as const,   status: "TODO" as const,        category: "Stationery",   sortOrder: 4 },
    { title: "Finalise menu tasting",                    description: "Visit Spice Route for tasting session.", assigneeName: "Both",     dueDate: daysFromNow(14),  priority: "MEDIUM" as const, status: "TODO" as const,        category: "Catering",     sortOrder: 5 },
    { title: "Buy ring pillow",                          description: "Match ivory + gold theme.",              assigneeName: "Aanya",    dueDate: daysFromNow(20),  priority: "LOW" as const,    status: "TODO" as const,        category: "Decor",        sortOrder: 6 },
    { title: "Apply for marriage licence",               description: "Lambeth registry office paperwork.",     assigneeName: "Both",     dueDate: daysFromNow(25),  priority: "HIGH" as const,   status: "IN_PROGRESS" as const, category: "Admin",        sortOrder: 7 },
    { title: "Confirm hair & makeup trial",              description: "Lock the trial 6 weeks before.",         assigneeName: "Aanya",    dueDate: daysFromNow(30),  priority: "MEDIUM" as const, status: "TODO" as const,        category: "Beauty",       sortOrder: 8 },
    { title: "Order wedding favours",                    description: "Personalised mini chai boxes.",          assigneeName: "Aarav",    dueDate: daysFromNow(45),  priority: "LOW" as const,    status: "TODO" as const,        category: "Decor",        sortOrder: 9 },
    { title: "Brief MC for reception",                   description: "Run order + speech timings.",            assigneeName: "Aarav",    dueDate: daysFromNow(60),  priority: "MEDIUM" as const, status: "TODO" as const,        category: "Reception",    sortOrder: 10 },
    { title: "Book honeymoon flights",                   description: "Maldives — direct flights preferred.",   assigneeName: "Both",     dueDate: daysFromNow(-5),  priority: "MEDIUM" as const, status: "COMPLETED" as const,   category: "Honeymoon",    sortOrder: 11, completedAt: daysFromNow(-5) },
  ];
  await tx.task.createMany({
    data: tasks.map((t) => ({ weddingId, ...t, reminderSentAt: null })),
  });

  // ─── Checklist Items ────────────────────────────────────────────────────
  const checklists = [
    { title: "Sign venue contract",               category: "Venue",       isCompleted: true,  sortOrder: 0 },
    { title: "Pay venue deposit",                 category: "Venue",       isCompleted: true,  sortOrder: 1 },
    { title: "Confirm catering menu",             category: "Catering",    isCompleted: false, sortOrder: 2 },
    { title: "Order printed invites",             category: "Stationery",  isCompleted: true,  sortOrder: 3 },
    { title: "Build wedding website",             category: "Stationery",  isCompleted: false, sortOrder: 4 },
    { title: "Bridal lehenga first fitting",      category: "Outfits",     isCompleted: false, sortOrder: 5 },
    { title: "Groom sherwani fitting",            category: "Outfits",     isCompleted: false, sortOrder: 6 },
    { title: "Book hair & makeup trial",          category: "Beauty",      isCompleted: false, sortOrder: 7 },
    { title: "Hire mehndi artist",                category: "Beauty",      isCompleted: true,  sortOrder: 8 },
    { title: "Confirm DJ playlist",               category: "Music",       isCompleted: false, sortOrder: 9 },
    { title: "Book wedding day transport",        category: "Transport",   isCompleted: false, sortOrder: 10 },
    { title: "Order wedding cake",                category: "Catering",    isCompleted: false, sortOrder: 11 },
  ];
  await tx.checklistItem.createMany({
    data: checklists.map((c) => ({
      weddingId,
      ...c,
      completedAt: c.isCompleted ? daysFromNow(-7) : null,
    })),
  });

  // ─── Mood Board ─────────────────────────────────────────────────────────
  const moodBoardItems = [
    { title: "Mandap florals (peach + ivory)",  category: "Decor",   tags: ["florals", "mandap", "peach"], notes: "Inspiration for the mandap pillars.", imageUrl: "https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&w=900" },
    { title: "Bridal makeup look",              category: "Beauty",  tags: ["makeup", "bridal", "glow"],   notes: "Soft glam, gold eyeshadow.",         imageUrl: "https://images.unsplash.com/photo-1492446845049-9c50cc313f00?auto=format&w=900" },
    { title: "Reception lighting",              category: "Decor",   tags: ["lighting", "reception"],      notes: "Warm fairy lights + uplighters.",    imageUrl: "https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&w=900" },
    { title: "Lehenga embroidery detail",       category: "Outfits", tags: ["lehenga", "embroidery"],      notes: "Antique gold zardozi work.",         imageUrl: "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&w=900" },
    { title: "Cake design — three tier",        category: "Cake",    tags: ["cake", "ivory", "florals"],   notes: "Ivory buttercream with sugar flowers.", imageUrl: "https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&w=900" },
    { title: "Sangeet stage backdrop",          category: "Decor",   tags: ["sangeet", "stage"],           notes: "Marigold curtain + monogram.",       imageUrl: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&w=900" },
  ];
  await tx.moodBoardItem.createMany({
    data: moodBoardItems.map((m) => ({ weddingId, ...m, isSaved: true })),
  });

  // ─── Beauty Professionals + Trials ──────────────────────────────────────
  const mua = await tx.beautyProfessional.create({
    data: {
      weddingId,
      name: "Aisha Beauty Studio",
      type: "MUA",
      email: "hello@aishabeauty.co.uk",
      phone: "+44 7700 900060",
      website: "https://aishabeauty.co.uk",
      instagram: "@aishabeauty",
      cost: 600,
      notes: "Recommended by Meera.",
    },
  });
  const hair = await tx.beautyProfessional.create({
    data: {
      weddingId,
      name: "Style by Priya",
      type: "HAIRSTYLIST",
      email: "priya@stylebypriya.com",
      phone: "+44 7700 900061",
      instagram: "@stylebypriya",
      cost: 350,
    },
  });
  await tx.beautyTrial.create({
    data: {
      professionalId: mua.id,
      date: daysFromNow(28),
      location: "Aisha Beauty Studio, Hounslow",
      notes: "Bring lehenga dupatta swatch.",
    },
  });
  await tx.beautyTrial.create({
    data: {
      professionalId: hair.id,
      date: daysFromNow(35),
      location: "Style by Priya, Wembley",
      notes: "Trial bridal hair + reception look.",
    },
  });

  const beautyInspirations = [
    { imageUrl: "https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?auto=format&w=900", caption: "Soft glam bridal look", category: "Makeup" },
    { imageUrl: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&w=900", caption: "Low bun with maang tikka", category: "Hair" },
  ];
  await tx.beautyInspiration.createMany({
    data: beautyInspirations.map((b) => ({ weddingId, ...b })),
  });

  // ─── Menu (food + beverages) ────────────────────────────────────────────
  const menuItems = [
    { name: "Paneer Tikka",         category: "APPETIZER" as const,   description: "Grilled paneer with mint chutney.", isVegetarian: true,  isVegan: false, isGlutenFree: true,  sortOrder: 0 },
    { name: "Chicken Biryani",      category: "MAIN_COURSE" as const, description: "Saffron-laced basmati rice with chicken.", isVegetarian: false, isVegan: false, isGlutenFree: true, sortOrder: 1 },
    { name: "Dal Makhani",          category: "MAIN_COURSE" as const, description: "Slow-cooked black lentils.",        isVegetarian: true,  isVegan: false, isGlutenFree: true,  sortOrder: 2 },
    { name: "Garlic Naan",          category: "SIDE_DISH" as const,   description: "Buttered naan with garlic.",        isVegetarian: true,  isVegan: false, isGlutenFree: false, sortOrder: 3 },
    { name: "Gulab Jamun",          category: "DESSERT" as const,     description: "Warm milk dumplings in syrup.",     isVegetarian: true,  isVegan: false, isGlutenFree: false, sortOrder: 4 },
  ];
  await tx.menuItem.createMany({
    data: menuItems.map((m) => ({ weddingId, ...m })),
  });

  const menuBeverages = [
    { name: "Mango Lassi",          category: "NON_ALCOHOLIC" as const, vendor: null,                description: "Yoghurt + mango pulp.",  isAlcoholic: false, sortOrder: 0 },
    { name: "Masala Chai",          category: "NON_ALCOHOLIC" as const, vendor: null,                description: "Spiced milk tea.",        isAlcoholic: false, sortOrder: 1 },
    { name: "House Red",            category: "WINE" as const,          vendor: "Spice Route",       description: "Tempranillo blend.",      isAlcoholic: true,  sortOrder: 2 },
    { name: "Mango Bellini",        category: "COCKTAIL" as const,      vendor: "Bar Hire Co.",      description: "Prosecco + mango puree.", isAlcoholic: true,  sortOrder: 3 },
  ];
  await tx.menuBeverage.createMany({
    data: menuBeverages.map((b) => ({ weddingId, ...b })),
  });

  // ─── Notes (section-based) ──────────────────────────────────────────────
  const notes = [
    { section: "beauty",   content: "Aisha prefers morning trials. Confirm at least 2 weeks ahead." },
    { section: "catering", content: "Spice Route can accommodate halal + jain on request." },
    { section: "vendors",  content: "Mandap Magic quote excludes draping fabric — clarify with Pooja." },
  ];
  await tx.note.createMany({
    data: notes.map((n) => ({ weddingId, ...n })),
  });

  // ─── Summary ────────────────────────────────────────────────────────────
  return {
    weddings: 1,
    events: events.length,
    guests: guestSeeds.length,
    budgetItems: budgetItems.length,
    vendors: 6,
    payments: payments.length,
    outfits: outfits.length,
    tasks: tasks.length,
    checklists: checklists.length,
    seatingTables,
    moodBoardItems: moodBoardItems.length,
    beautyProfessionals: 2,
    beautyTrials: 2,
    beautyInspirations: beautyInspirations.length,
    menuItems: menuItems.length,
    menuBeverages: menuBeverages.length,
    notes: notes.length,
  };
}
